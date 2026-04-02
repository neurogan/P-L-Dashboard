/**
 * Amazon Advertising Ingestion Module
 *
 * Pulls ad performance data from MarketplaceAdPros MCP endpoint
 * by ASIN by week, and upserts into ad_weekly_summary + weekly_metrics.
 *
 * Required env vars:
 *   MARKETPLACEADPROS_API_KEY
 *   MARKETPLACEADPROS_INTEGRATION_ID
 *   MARKETPLACEADPROS_ACCOUNT_ID
 */
import { db } from "../storage";
import { adWeeklySummary, weeklyMetrics } from "@shared/schema";
import { sql, eq, and } from "drizzle-orm";

const MCP_ENDPOINT = "https://app.marketplaceadpros.com/mcp";

interface McpResponse {
  result: {
    content: Array<{ type: string; text?: string; resource?: any }>;
  };
}

/**
 * Call the MarketplaceAdPros MCP ask_report_analyst tool
 */
async function askReportAnalyst(question: string): Promise<string> {
  const apiKey = process.env.MARKETPLACEADPROS_API_KEY!;
  const integrationId = process.env.MARKETPLACEADPROS_INTEGRATION_ID!;
  const accountId = process.env.MARKETPLACEADPROS_ACCOUNT_ID!;

  const res = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "ask_report_analyst",
        arguments: {
          integration_id: integrationId,
          account_id: accountId,
          question,
        },
      },
      id: Date.now(),
    }),
  });

  const data: McpResponse = await res.json();
  return data.result?.content?.[0]?.text || "";
}

/**
 * Parse JSON array from MCP response text
 */
function extractJsonArray(text: string): any[] {
  const start = text.indexOf("[");
  if (start < 0) return [];
  const end = text.lastIndexOf("]");
  if (end < 0) return [];
  try {
    return JSON.parse(text.substring(start, end + 1));
  } catch {
    return [];
  }
}

/**
 * Pull ad performance data and upsert into database
 */
export async function syncAmazonAds(startDate: string, endDate: string) {
  const requiredVars = [
    "MARKETPLACEADPROS_API_KEY",
    "MARKETPLACEADPROS_INTEGRATION_ID",
    "MARKETPLACEADPROS_ACCOUNT_ID",
  ];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    return { status: "skipped", reason: `Missing env vars: ${missing.join(", ")}` };
  }

  console.log(`[Amazon Ads] Syncing ${startDate} to ${endDate}`);

  const question = `Query the sponsored_products_product_ads report for date range ${startDate} to ${endDate}. Group by advertisedAsin and week. Return columns: week_start (min date in week), asin (advertisedAsin), cost, impressions, clicks, purchases1d, sales1d. Output as JSON array inline.`;

  const responseText = await askReportAnalyst(question);
  const rows = extractJsonArray(responseText);

  if (rows.length === 0) {
    console.log("[Amazon Ads] No data returned from MCP");
    return { status: "completed", updated: 0, errors: [] };
  }

  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const acos = row.sales1d > 0 ? row.cost / row.sales1d : null;

      await db
        .insert(adWeeklySummary)
        .values({
          asin: row.asin,
          weekStartDate: row.week_start,
          spend: row.cost || 0,
          impressions: row.impressions || 0,
          clicks: row.clicks || 0,
          orders: row.purchases1d || 0,
          adSales: row.sales1d || 0,
          acos,
        })
        .onConflictDoUpdate({
          target: [adWeeklySummary.asin, adWeeklySummary.weekStartDate],
          set: {
            spend: sql`EXCLUDED.spend`,
            impressions: sql`EXCLUDED.impressions`,
            clicks: sql`EXCLUDED.clicks`,
            orders: sql`EXCLUDED.orders`,
            adSales: sql`EXCLUDED.ad_sales`,
            acos: sql`EXCLUDED.acos`,
          },
        });

      // Also update weekly_metrics with ad data
      await db
        .update(weeklyMetrics)
        .set({
          adSpend: row.cost || 0,
          adImpressions: row.impressions || 0,
          adClicks: row.clicks || 0,
          adOrders: row.purchases1d || 0,
          adSales: row.sales1d || 0,
          acos,
          hasAdData: true,
          tacos: sql`CASE WHEN ${weeklyMetrics.revenue} > 0 THEN ${row.cost || 0} / ${weeklyMetrics.revenue} ELSE NULL END`,
          organicSales: sql`CASE WHEN ${weeklyMetrics.revenue} > 0 THEN ${weeklyMetrics.revenue} - ${row.sales1d || 0} ELSE NULL END`,
        })
        .where(
          and(
            eq(weeklyMetrics.asin, row.asin),
            eq(weeklyMetrics.weekStartDate, row.week_start),
            eq(weeklyMetrics.channel, "amazon")
          )
        );

      updated++;
    } catch (err: any) {
      errors.push(`${row.asin}/${row.week_start}: ${err.message}`);
    }
  }

  console.log(`[Amazon Ads] Done: ${updated} rows upserted, ${errors.length} errors`);
  return { status: "completed", updated, errors };
}
