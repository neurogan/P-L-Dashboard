/**
 * Shopify Ingestion Module
 *
 * Pulls orders from Shopify Admin GraphQL API, splits into DTC vs Faire,
 * aggregates by SKU by week, and upserts into weekly_metrics.
 *
 * Required env vars:
 *   SHOPIFY_STORE_URL (e.g., "neurogan-health.myshopify.com")
 *   SHOPIFY_ACCESS_TOKEN
 */
import { db } from "../storage";
import { weeklyMetrics } from "@shared/schema";
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

/**
 * Fetch orders from Shopify Admin GraphQL API
 */
async function fetchOrders(
  startDate: string,
  endDate: string,
  cursor: string | null = null
): Promise<{ orders: ShopifyOrder[]; hasNextPage: boolean; endCursor: string | null }> {
  const storeUrl = process.env.SHOPIFY_STORE_URL!;
  const token = process.env.SHOPIFY_ACCESS_TOKEN!;

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
 * Pull Shopify orders and upsert into weekly_metrics
 */
export async function syncShopifyOrders(startDate: string, endDate: string) {
  const requiredVars = ["SHOPIFY_STORE_URL", "SHOPIFY_ACCESS_TOKEN"];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    return { status: "skipped", reason: `Missing env vars: ${missing.join(", ")}` };
  }

  console.log(`[Shopify] Syncing ${startDate} to ${endDate}`);

  // Fetch all orders with pagination
  let allOrders: ShopifyOrder[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const page = await fetchOrders(startDate, endDate, cursor);
    allOrders = allOrders.concat(page.orders);
    hasMore = page.hasNextPage;
    cursor = page.endCursor;
    console.log(`  ... fetched ${allOrders.length} orders`);
  }

  // Filter to paid orders only
  const paidOrders = allOrders.filter(
    (o) => o.displayFinancialStatus === "PAID" || o.displayFinancialStatus === "PARTIALLY_REFUNDED"
  );
  console.log(`  ${paidOrders.length} paid orders (of ${allOrders.length} total)`);

  // Aggregate by (channel, week, sku)
  const agg: Record<string, { revenue: number; units: number; orders: Set<string> }> = {};

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
      if (!agg[key]) agg[key] = { revenue: 0, units: 0, orders: new Set() };
      agg[key].revenue += lineTotal;
      agg[key].units += qty;
      agg[key].orders.add(order.name);
    }
  }

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
          sku,
          channel,
          weekStartDate: week,
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
