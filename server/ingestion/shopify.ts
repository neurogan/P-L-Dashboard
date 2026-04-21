/**
 * Shopify Ingestion Module
 *
 * Pulls orders from Shopify Admin GraphQL API, splits into DTC vs Faire,
 * aggregates by SKU by week, and upserts into weekly_metrics.
 *
 * Supports multiple stores via prefixed env vars:
 *   NEUROGAN_HEALTH_SHOPIFY_STORE_URL / NEUROGAN_HEALTH_SHOPIFY_ACCESS_TOKEN
 *   NEUROGAN_CBD_SHOPIFY_STORE_URL    / NEUROGAN_CBD_SHOPIFY_ACCESS_TOKEN
 *   NEUROGAN_PETS_SHOPIFY_STORE_URL   / NEUROGAN_PETS_SHOPIFY_ACCESS_TOKEN
 *
 * Falls back to SHOPIFY_STORE_URL / SHOPIFY_ACCESS_TOKEN for single-store setups.
 */
import { db } from "../storage";
import { weeklyMetrics, products } from "@shared/schema";
import { sql } from "drizzle-orm";

const SHOPIFY_PAYMENTS_RATE = 0.029;
const SHOPIFY_PAYMENTS_FLAT = 0.30;

interface ShopifyOrder {
  name: string;
  processedAt: string;
  tags: string[];
  displayFinancialStatus: string;
  subtotalPriceSet: { shopMoney: { amount: string } };
  totalShippingPriceSet: { shopMoney: { amount: string } };
  totalTaxSet: { shopMoney: { amount: string } };
  totalPriceSet: { shopMoney: { amount: string } };
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        variant: { sku: string | null } | null;
        originalUnitPriceSet: { shopMoney: { amount: string } };
      };
    }>;
  };
}

interface ShopifyStoreConfig {
  name: string;
  storeUrl: string;
  accessToken: string;
}

/**
 * Discover all configured Shopify stores from environment variables.
 * Looks for NEUROGAN_*_SHOPIFY_STORE_URL patterns, falls back to SHOPIFY_STORE_URL.
 */
function getShopifyStores(): ShopifyStoreConfig[] {
  const stores: ShopifyStoreConfig[] = [];

  // Check for prefixed multi-store config
  const prefixes = ["NEUROGAN_HEALTH", "NEUROGAN_CBD", "NEUROGAN_PETS"];
  for (const prefix of prefixes) {
    const url = process.env[`${prefix}_SHOPIFY_STORE_URL`];
    const token = process.env[`${prefix}_SHOPIFY_ACCESS_TOKEN`];
    if (url && token) {
      stores.push({
        name: prefix.replace("NEUROGAN_", "").toLowerCase(),
        storeUrl: url,
        accessToken: token,
      });
    }
  }

  // Fall back to single-store config
  if (stores.length === 0 && process.env.SHOPIFY_STORE_URL && process.env.SHOPIFY_ACCESS_TOKEN) {
    stores.push({
      name: "default",
      storeUrl: process.env.SHOPIFY_STORE_URL,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    });
  }

  return stores;
}

/**
 * Fetch orders from Shopify Admin GraphQL API
 */
async function fetchOrders(
  storeUrl: string,
  token: string,
  startDate: string,
  endDate: string,
  cursor: string | null = null
): Promise<{ orders: ShopifyOrder[]; hasNextPage: boolean; endCursor: string | null }> {

  const afterClause = cursor ? `, after: "${cursor}"` : "";
  const query = `{
    orders(first: 250, query: "created_at:>=${startDate} created_at:<${endDate}", sortKey: CREATED_AT${afterClause}) {
      edges {
        cursor
        node {
          name
          processedAt
          tags
          displayFinancialStatus
          subtotalPriceSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          totalPriceSet { shopMoney { amount } }
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                variant { sku }
                originalUnitPriceSet { shopMoney { amount } }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`;

  const res = await fetch(`https://${storeUrl}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  const edges = data?.data?.orders?.edges || [];
  const pageInfo = data?.data?.orders?.pageInfo || {};

  return {
    orders: edges.map((e: any) => e.node),
    hasNextPage: pageInfo.hasNextPage || false,
    endCursor: pageInfo.endCursor || null,
  };
}

/**
 * Get Monday of the week for a given date
 */
function getWeekMonday(dateStr: string): string {
  const dt = new Date(dateStr);
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().split("T")[0];
}

/**
 * Pull Shopify orders from all configured stores and upsert into weekly_metrics
 */
export async function syncShopifyOrders(startDate: string, endDate: string) {
  const stores = getShopifyStores();
  if (stores.length === 0) {
    return { status: "skipped", reason: "No Shopify stores configured" };
  }

  console.log(`[Shopify] Syncing ${startDate} to ${endDate} across ${stores.length} store(s)`);

  // Fetch orders from all stores
  let allOrders: ShopifyOrder[] = [];

  for (const store of stores) {
    console.log(`[Shopify] Fetching from ${store.name} (${store.storeUrl})...`);
    let cursor: string | null = null;
    let hasMore = true;
    let storeOrderCount = 0;

    while (hasMore) {
      const page = await fetchOrders(store.storeUrl, store.accessToken, startDate, endDate, cursor);
      allOrders = allOrders.concat(page.orders);
      storeOrderCount += page.orders.length;
      hasMore = page.hasNextPage;
      cursor = page.endCursor;
    }
    console.log(`  ${store.name}: ${storeOrderCount} orders`);
  }

  // Filter to paid orders only
  const paidOrders = allOrders.filter(
    (o) => o.displayFinancialStatus === "PAID" || o.displayFinancialStatus === "PARTIALLY_REFUNDED"
  );
  console.log(`  ${paidOrders.length} paid orders (of ${allOrders.length} total)`);

  // Aggregate by (channel, week, sku) and track product titles
  const agg: Record<string, { revenue: number; units: number; orders: Set<string>; title: string }> = {};
  const skuTitles: Record<string, string> = {}; // sku → most recent product title
  const skuChannels: Record<string, Set<string>> = {}; // sku → set of channels

  for (const order of paidOrders) {
    const channel = order.tags.includes("Faire") ? "faire" : "shopify_dtc";
    const week = getWeekMonday(order.processedAt);

    for (const edge of order.lineItems.edges) {
      const item = edge.node;
      const sku = item.variant?.sku || "UNKNOWN";
      const qty = item.quantity;
      const unitPrice = parseFloat(item.originalUnitPriceSet.shopMoney.amount);
      const lineTotal = qty * unitPrice;

      const key = `${channel}|${week}|${sku}`;
      if (!agg[key]) agg[key] = { revenue: 0, units: 0, orders: new Set(), title: item.title };
      agg[key].revenue += lineTotal;
      agg[key].units += qty;
      agg[key].orders.add(order.name);

      // Track product title and channels per SKU
      if (sku !== "UNKNOWN") {
        skuTitles[sku] = item.title;
        if (!skuChannels[sku]) skuChannels[sku] = new Set();
        skuChannels[sku].add(channel);
      }
    }
  }

  // Upsert discovered Shopify products into the products table
  let productsUpserted = 0;
  for (const [sku, title] of Object.entries(skuTitles)) {
    const channels = Array.from(skuChannels[sku] || []);
    try {
      await db
        .insert(products)
        .values({ sku, productTitle: title, channels })
        .onConflictDoUpdate({
          target: [products.sku],
          set: {
            productTitle: sql`
              CASE
                WHEN ${products.productTitle} IS NULL OR ${products.productTitle} = ''
                THEN EXCLUDED.product_title
                ELSE ${products.productTitle}
              END
            `,
            channels: sql`
              (SELECT array_agg(DISTINCT val) FROM unnest(${products.channels} || EXCLUDED.channels) AS val)
            `,
          },
        });
      productsUpserted++;
    } catch (err: any) {
      // Not critical — log and continue
      console.warn(`[Shopify] Failed to upsert product ${sku}: ${err.message}`);
    }
  }
  console.log(`[Shopify] ${productsUpserted} products upserted into catalog`);

  // Upsert into weekly_metrics
  let updated = 0;
  const errors: string[] = [];

  for (const [key, data] of Object.entries(agg)) {
    const [channel, week, sku] = key.split("|");
    if (!sku || sku === "UNKNOWN") continue;

    const orderCount = data.orders.size;
    const paymentFees = channel === "shopify_dtc"
      ? data.revenue * SHOPIFY_PAYMENTS_RATE + orderCount * SHOPIFY_PAYMENTS_FLAT
      : 0;

    try {
      await db
        .insert(weeklyMetrics)
        .values({
          brandId: 1,
          sku,
          channel,
          weekStartDate: week,
          productTitle: data.title || null,
          revenue: Math.round(data.revenue * 100) / 100,
          unitsSold: data.units,
          orderCount,
          avgUnitPrice: data.units > 0 ? Math.round((data.revenue / data.units) * 100) / 100 : null,
          paymentFees: Math.round(paymentFees * 100) / 100,
          netProceeds: Math.round((data.revenue - paymentFees) * 100) / 100,
          avgUnitsPerOrder: orderCount > 0 ? Math.round((data.units / orderCount) * 100) / 100 : null,
          revenuePerOrder: orderCount > 0 ? Math.round((data.revenue / orderCount) * 100) / 100 : null,
          feeSource: "calculated",
        })
        .onConflictDoUpdate({
          target: [weeklyMetrics.sku, weeklyMetrics.weekStartDate, weeklyMetrics.channel],
          set: {
            productTitle: sql`COALESCE(EXCLUDED.product_title, ${weeklyMetrics.productTitle})`,
            revenue: sql`EXCLUDED.revenue`,
            unitsSold: sql`EXCLUDED.units_sold`,
            orderCount: sql`EXCLUDED.order_count`,
            avgUnitPrice: sql`EXCLUDED.avg_unit_price`,
            paymentFees: sql`EXCLUDED.payment_fees`,
            netProceeds: sql`EXCLUDED.net_proceeds`,
          },
        });
      updated++;
    } catch (err: any) {
      errors.push(`${sku}/${week}: ${err.message}`);
    }
  }

  const dtcOrders = paidOrders.filter((o) => !o.tags.includes("Faire")).length;
  const faireOrders = paidOrders.length - dtcOrders;

  console.log(`[Shopify] Done: ${updated} rows, ${dtcOrders} DTC + ${faireOrders} Faire orders`);
  return { status: "completed", updated, dtcOrders, faireOrders, errors };
}
