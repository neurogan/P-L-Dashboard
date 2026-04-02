/**
 * Amazon Advertising / MarketplaceAdPros ingestion module.
 *
 * Pulls ad performance data by ASIN and week, upserts into
 * ad_weekly_summary and updates weekly_metrics ad fields.
 *
 * Required env vars:
 *   AMAZON_ADS_CLIENT_ID
 *   AMAZON_ADS_CLIENT_SECRET
 *   AMAZON_ADS_REFRESH_TOKEN
 *   AMAZON_ADS_PROFILE_ID
 *
 * Alternative: MarketplaceAdPros MCP endpoint
 *   MARKETPLACE_AD_PROS_API_KEY
 *   MARKETPLACE_AD_PROS_ACCOUNT_ID
 */
import { db } from "../storage";
import { adWeeklySummary, weeklyMetrics } from "@shared/schema";
import { sql, eq, and } from "drizzle-orm";

interface AdPerformanceRow {
  asin: string;
  sku: string;
  productTitle: string;
  weekStartDate: string;
  spend: number;
  impressions: number;
  clicks: number;
  orders: number;
  adSales: number;
  totalRevenue: number;
}

export async function pullAmazonAdMetrics(
  startDate: string,
  endDate: string,
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  const apiKey = process.env.MARKETPLACE_AD_PROS_API_KEY;
  const accountId = process.env.MARKETPLACE_AD_PROS_ACCOUNT_ID;
  const adsClientId = process.env.AMAZON_ADS_CLIENT_ID;

  if (!apiKey && !adsClientId) {
    errors.push("Missing ad API credentials — skipping ad data sync");
    return { inserted, errors };
  }

  try {
    // TODO: Implement one of these approaches:
    //
    // Option A: MarketplaceAdPros API
    // GET https://api.marketplaceadpros.com/v1/reports/weekly
    //   Headers: { Authorization: `Bearer ${apiKey}`, X-Account-Id: accountId }
    //   Query: { start_date: startDate, end_date: endDate, group_by: "asin,week" }
    //
    // Option B: Amazon Advertising API
    // POST https://advertising-api.amazon.com/sp/reports
    //   Headers: { Authorization: `Bearer ${accessToken}`, Amazon-Advertising-API-ClientId, Amazon-Advertising-API-Scope: profileId }
    //   Body: { reportDate, metrics: "impressions,clicks,cost,attributedSales7d,attributedUnitsOrdered7d" }

    const _rows: AdPerformanceRow[] = [];

    for (const row of _rows) {
      const acos = row.adSales > 0 ? row.spend / row.adSales : null;
      const tacos = row.totalRevenue > 0 ? row.spend / row.totalRevenue : null;

      // Upsert into ad_weekly_summary
      await db
        .insert(adWeeklySummary)
        .values({
          asin: row.asin,
          sku: row.sku,
          productTitle: row.productTitle,
          weekStartDate: row.weekStartDate,
          spend: row.spend,
          impressions: row.impressions,
          clicks: row.clicks,
          orders: row.orders,
          adSales: row.adSales,
          acos,
          tacos,
          totalRevenue: row.totalRevenue,
        })
        .onConflictDoUpdate({
          target: [adWeeklySummary.asin, adWeeklySummary.weekStartDate],
          set: {
            spend: sql`excluded.spend`,
            impressions: sql`excluded.impressions`,
            clicks: sql`excluded.clicks`,
            orders: sql`excluded.orders`,
            adSales: sql`excluded.ad_sales`,
            acos: sql`excluded.acos`,
            tacos: sql`excluded.tacos`,
            totalRevenue: sql`excluded.total_revenue`,
          },
        });

      // Also update weekly_metrics ad fields for this ASIN/week
      await db
        .update(weeklyMetrics)
        .set({
          adSpend: row.spend,
          adImpressions: row.impressions,
          adClicks: row.clicks,
          adOrders: row.orders,
          adSales: row.adSales,
          acos,
          tacos,
          hasAdData: true,
          organicSales: row.totalRevenue > row.adSales ? row.totalRevenue - row.adSales : null,
        })
        .where(
          and(
            eq(weeklyMetrics.asin, row.asin),
            eq(weeklyMetrics.weekStartDate, row.weekStartDate),
            eq(weeklyMetrics.channel, "amazon"),
          ),
        );

      inserted++;
    }
  } catch (err: any) {
    errors.push(`Amazon Ads error: ${err.message}`);
  }

  return { inserted, errors };
}
