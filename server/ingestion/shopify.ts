/**
 * Shopify / Faire ingestion module.
 *
 * Pulls order data from the Shopify Admin GraphQL API, splits
 * into DTC vs Faire based on "Faire" tag, aggregates by SKU
 * by week, and upserts into weekly_metrics.
 *
 * Required env vars:
 *   SHOPIFY_STORE_URL     (e.g., "neurogan.myshopify.com")
 *   SHOPIFY_ACCESS_TOKEN  (Admin API access token)
 */
import { db } from "../storage";
import { weeklyMetrics } from "@shared/schema";
import { sql } from "drizzle-orm";

interface ShopifyOrder {
  id: string;
  createdAt: string;
  tags: string[];
  lineItems: Array<{
    sku: string;
    title: string;
    quantity: number;
    originalTotalSet: { shopMoney: { amount: string } };
  }>;
  totalPriceSet: { shopMoney: { amount: string } };
  subtotalPriceSet: { shopMoney: { amount: string } };
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  // Shift to Monday-based week start
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export async function pullShopifyOrders(
  startDate: string,
  endDate: string,
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  const storeUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!storeUrl || !accessToken) {
    errors.push("Missing Shopify credentials — skipping Shopify sync");
    return { inserted, errors };
  }

  try {
    // TODO: Implement Shopify Admin GraphQL API call
    //
    // POST https://${storeUrl}/admin/api/2024-01/graphql.json
    // Headers: { X-Shopify-Access-Token: accessToken }
    // Query:
    //   {
    //     orders(first: 250, query: "created_at:>=${startDate} created_at:<=${endDate}") {
    //       edges {
    //         node {
    //           id
    //           createdAt
    //           tags
    //           lineItems(first: 50) {
    //             edges {
    //               node {
    //                 sku
    //                 title
    //                 quantity
    //                 originalTotalSet { shopMoney { amount } }
    //               }
    //             }
    //           }
    //           totalPriceSet { shopMoney { amount } }
    //           subtotalPriceSet { shopMoney { amount } }
    //         }
    //       }
    //       pageInfo { hasNextPage, endCursor }
    //     }
    //   }
    //
    // Paginate through all orders using endCursor.

    const _orders: ShopifyOrder[] = [];

    // Step 2: Classify and aggregate by SKU by week
    const buckets = new Map<
      string,
      {
        sku: string;
        productTitle: string;
        channel: "shopify_dtc" | "faire";
        weekStartDate: string;
        revenue: number;
        unitsSold: number;
        orderCount: number;
      }
    >();

    for (const order of _orders) {
      const isFaire = order.tags.some((t) => t.toLowerCase().includes("faire"));
      const channel: "shopify_dtc" | "faire" = isFaire ? "faire" : "shopify_dtc";
      const weekStart = getWeekStart(order.createdAt);

      for (const item of order.lineItems) {
        if (!item.sku) continue;
        const key = `${item.sku}__${weekStart}__${channel}`;
        const existing = buckets.get(key);
        const lineRevenue = parseFloat(item.originalTotalSet.shopMoney.amount);

        if (existing) {
          existing.revenue += lineRevenue;
          existing.unitsSold += item.quantity;
          existing.orderCount += 1;
        } else {
          buckets.set(key, {
            sku: item.sku,
            productTitle: item.title,
            channel,
            weekStartDate: weekStart,
            revenue: lineRevenue,
            unitsSold: item.quantity,
            orderCount: 1,
          });
        }
      }
    }

    // Step 3: Upsert into weekly_metrics
    for (const row of Array.from(buckets.values())) {
      const avgUnitPrice = row.unitsSold > 0 ? row.revenue / row.unitsSold : null;

      await db
        .insert(weeklyMetrics)
        .values({
          sku: row.sku,
          channel: row.channel,
          weekStartDate: row.weekStartDate,
          productTitle: row.productTitle,
          revenue: row.revenue,
          unitsSold: row.unitsSold,
          orderCount: row.orderCount,
          avgUnitPrice,
        })
        .onConflictDoUpdate({
          target: [weeklyMetrics.sku, weeklyMetrics.weekStartDate, weeklyMetrics.channel],
          set: {
            revenue: sql`excluded.revenue`,
            unitsSold: sql`excluded.units_sold`,
            orderCount: sql`excluded.order_count`,
            avgUnitPrice: sql`excluded.avg_unit_price`,
          },
        });
      inserted++;
    }
  } catch (err: any) {
    errors.push(`Shopify error: ${err.message}`);
  }

  return { inserted, errors };
}
