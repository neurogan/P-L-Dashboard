/**
 * Amazon SP-API ingestion module.
 *
 * Pulls order metrics from the Selling Partner API and upserts
 * into the weekly_metrics table.
 *
 * Required env vars:
 *   AMAZON_SP_API_CLIENT_ID
 *   AMAZON_SP_API_CLIENT_SECRET
 *   AMAZON_SP_API_REFRESH_TOKEN
 *   AMAZON_SP_API_MARKETPLACE_ID  (default: ATVPDKIKX0DER for US)
 *
 * Endpoint: POST /sales/v1/orderMetrics
 *   - Granularity: WEEK
 *   - Groups by ASIN
 */
import { db } from "../storage";
import { weeklyMetrics } from "@shared/schema";
import { sql } from "drizzle-orm";

interface AmazonOrderMetric {
  asin: string;
  sku: string;
  interval: string; // "2026-03-10T00:00:00--2026-03-17T00:00:00"
  unitCount: number;
  orderItemCount: number;
  orderCount: number;
  averageSalesPrice: { amount: number; currencyCode: string };
  totalSales: { amount: number; currencyCode: string };
}

export async function pullAmazonOrderMetrics(
  startDate: string,
  endDate: string,
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  const clientId = process.env.AMAZON_SP_API_CLIENT_ID;
  const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET;
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;
  const marketplaceId = process.env.AMAZON_SP_API_MARKETPLACE_ID || "ATVPDKIKX0DER";

  if (!clientId || !clientSecret || !refreshToken) {
    errors.push("Missing AMAZON_SP_API credentials — skipping Amazon order sync");
    return { inserted, errors };
  }

  try {
    // Step 1: Get LWA access token
    // TODO: Replace with actual SP-API auth call
    // POST https://api.amazon.com/auth/o2/token
    // Body: { grant_type: "refresh_token", client_id, client_secret, refresh_token }
    const _accessToken = "TODO_IMPLEMENT_AUTH";

    // Step 2: Call getOrderMetrics
    // POST https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics
    // Query params:
    //   marketplaceIds: [marketplaceId]
    //   interval: `${startDate}T00:00:00--${endDate}T23:59:59`
    //   granularity: WEEK
    //   granularityTimeZone: America/Los_Angeles
    //   asin: (each ASIN)
    //
    // Response: { payload: AmazonOrderMetric[] }

    // TODO: Implement actual API call. Example transformation:
    const _metrics: AmazonOrderMetric[] = [];
    // const metrics = await callSpApi(accessToken, startDate, endDate, marketplaceId);

    for (const m of _metrics) {
      // Parse interval "2026-03-10T00:00:00--2026-03-17T00:00:00"
      const [intervalStart, intervalEnd] = m.interval.split("--");
      const weekStartDate = intervalStart.slice(0, 10);
      const weekEndDate = intervalEnd.slice(0, 10);

      await db
        .insert(weeklyMetrics)
        .values({
          sku: m.sku,
          asin: m.asin,
          channel: "amazon",
          weekStartDate,
          weekEndDate,
          revenue: m.totalSales.amount,
          unitsSold: m.unitCount,
          orderCount: m.orderCount,
          avgUnitPrice: m.averageSalesPrice.amount,
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
    errors.push(`Amazon SP-API error: ${err.message}`);
  }

  return { inserted, errors };
}
