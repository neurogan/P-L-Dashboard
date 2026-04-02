/**
 * Amazon SP-API Ingestion Module
 *
 * Pulls order metrics from Amazon Selling Partner API (getOrderMetrics)
 * for each ASIN, transforms into weekly_metrics rows, and upserts into PostgreSQL.
 *
 * Required env vars:
 *   AMAZON_SP_API_REFRESH_TOKEN
 *   AMAZON_SP_API_CLIENT_ID
 *   AMAZON_SP_API_CLIENT_SECRET
 *   AMAZON_SELLER_ID
 *   AMAZON_MARKETPLACE_ID (default: ATVPDKIKX0DER for US)
 */
import { db } from "../storage";
import { weeklyMetrics, products } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

const MARKETPLACE_ID = process.env.AMAZON_MARKETPLACE_ID || "ATVPDKIKX0DER";

interface SpApiOrderMetric {
  interval: string;
  unitCount: number;
  orderCount: number;
  orderItemCount: number;
  averageUnitPrice: { amount: number; currencyCode: string };
  totalSales: { amount: number; currencyCode: string };
}

/**
 * Get an LWA access token using the refresh token
 */
async function getAccessToken(): Promise<string> {
  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.AMAZON_SP_API_REFRESH_TOKEN!,
      client_id: process.env.AMAZON_SP_API_CLIENT_ID!,
      client_secret: process.env.AMAZON_SP_API_CLIENT_SECRET!,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`SP-API auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

/**
 * Call getOrderMetrics for a single ASIN over a date range
 */
async function getOrderMetrics(
  accessToken: string,
  asin: string,
  startDate: string,
  endDate: string,
  buyerType: "All" | "B2B" | "B2C" = "All"
): Promise<SpApiOrderMetric[]> {
  const interval = `${startDate}T00:00:00-07:00--${endDate}T00:00:00-07:00`;
  const params = new URLSearchParams({
    marketplaceIds: MARKETPLACE_ID,
    interval,
    granularity: "Week",
    granularityTimeZone: "America/Los_Angeles",
    firstDayOfWeek: "Monday",
    asin,
    buyerType,
  });

  const res = await fetch(
    `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics?${params}`,
    {
      headers: {
        "x-amz-access-token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`SP-API error for ${asin}: ${res.status} ${text}`);
    return [];
  }

  const data = await res.json();
  return data.payload || [];
}

/**
 * Pull Amazon order metrics for all products and upsert into weekly_metrics
 */
export async function syncAmazonSales(startDate: string, endDate: string) {
  const requiredVars = [
    "AMAZON_SP_API_REFRESH_TOKEN",
    "AMAZON_SP_API_CLIENT_ID",
    "AMAZON_SP_API_CLIENT_SECRET",
  ];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    return { status: "skipped", reason: `Missing env vars: ${missing.join(", ")}` };
  }

  console.log(`[Amazon SP-API] Syncing ${startDate} to ${endDate}`);
  const accessToken = await getAccessToken();

  // Get all Amazon products
  const allProducts = await db
    .select()
    .from(products)
    .where(sql`'amazon' = ANY(${products.channels})`);

  let updated = 0;
  let errors: string[] = [];

  for (const product of allProducts) {
    if (!product.asin) continue;

    try {
      // Pull total sales
      const metrics = await getOrderMetrics(accessToken, product.asin, startDate, endDate);

      // Pull B2B sales
      const b2bMetrics = await getOrderMetrics(accessToken, product.asin, startDate, endDate, "B2B");
      const b2bByWeek: Record<string, SpApiOrderMetric> = {};
      for (const m of b2bMetrics) {
        const weekStart = m.interval.split("T")[0];
        b2bByWeek[weekStart] = m;
      }

      for (const m of metrics) {
        const weekStart = m.interval.split("T")[0];
        const weekEndParts = m.interval.split("--")[1];
        const weekEnd = weekEndParts ? weekEndParts.split("T")[0] : null;

        const b2b = b2bByWeek[weekStart];
        const b2bRevenue = b2b?.totalSales.amount || 0;
        const b2bUnits = b2b?.unitCount || 0;
        const b2bOrders = b2b?.orderCount || 0;

        await db
          .insert(weeklyMetrics)
          .values({
            sku: product.sku,
            asin: product.asin,
            channel: "amazon",
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            productTitle: product.productTitle,
            revenue: m.totalSales.amount,
            unitsSold: m.unitCount,
            orderCount: m.orderCount,
            avgUnitPrice: m.averageUnitPrice.amount,
            b2bRevenue,
            b2bUnits,
            b2bOrders,
            b2cRevenue: m.totalSales.amount - b2bRevenue,
            b2cUnits: m.unitCount - b2bUnits,
            b2cOrders: m.orderCount - b2bOrders,
            avgUnitsPerOrder: m.orderCount > 0 ? m.unitCount / m.orderCount : null,
            revenuePerOrder: m.orderCount > 0 ? m.totalSales.amount / m.orderCount : null,
          })
          .onConflictDoUpdate({
            target: [weeklyMetrics.sku, weeklyMetrics.weekStartDate, weeklyMetrics.channel],
            set: {
              revenue: sql`EXCLUDED.revenue`,
              unitsSold: sql`EXCLUDED.units_sold`,
              orderCount: sql`EXCLUDED.order_count`,
              avgUnitPrice: sql`EXCLUDED.avg_unit_price`,
              b2bRevenue: sql`EXCLUDED.b2b_revenue`,
              b2bUnits: sql`EXCLUDED.b2b_units`,
              b2bOrders: sql`EXCLUDED.b2b_orders`,
              b2cRevenue: sql`EXCLUDED.b2c_revenue`,
              b2cUnits: sql`EXCLUDED.b2c_units`,
              b2cOrders: sql`EXCLUDED.b2c_orders`,
            },
          });
        updated++;
      }
    } catch (err: any) {
      errors.push(`${product.asin}: ${err.message}`);
    }
  }

  console.log(`[Amazon SP-API] Done: ${updated} rows upserted, ${errors.length} errors`);
  return { status: "completed", updated, errors };
}
