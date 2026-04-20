/**
 * Amazon SP-API Ingestion Module
 *
 * 1. Discovers active listings via Reports API (GET_MERCHANT_LISTINGS_DATA)
 *    and upserts them into the products table.
 * 2. Pulls order metrics from Amazon Selling Partner API (getOrderMetrics)
 *    for each ASIN, transforms into weekly_metrics rows, and upserts into PostgreSQL.
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
 * Discover active Amazon listings via Reports API and upsert into products table.
 * Uses GET_MERCHANT_LISTINGS_DATA which returns a TSV of all active listings.
 */
export async function syncAmazonProducts() {
  const requiredVars = [
    "AMAZON_SP_API_REFRESH_TOKEN",
    "AMAZON_SP_API_CLIENT_ID",
    "AMAZON_SP_API_CLIENT_SECRET",
    "AMAZON_SELLER_ID",
  ];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    return { status: "skipped", reason: `Missing env vars: ${missing.join(", ")}` };
  }

  console.log("[Amazon Products] Discovering active listings...");
  const accessToken = await getAccessToken();

  // 1. Request the report
  const createRes = await fetch(
    "https://sellingpartnerapi-na.amazon.com/reports/2021-06-30/reports",
    {
      method: "POST",
      headers: {
        "x-amz-access-token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportType: "GET_MERCHANT_LISTINGS_DATA",
        marketplaceIds: [MARKETPLACE_ID],
      }),
    }
  );

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create report: ${createRes.status} ${text}`);
  }

  const { reportId } = await createRes.json();
  console.log(`[Amazon Products] Report ${reportId} created, polling...`);

  // 2. Poll until the report is done (max ~5 minutes)
  let reportDocumentId: string | null = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 10_000)); // wait 10s between polls

    const pollRes = await fetch(
      `https://sellingpartnerapi-na.amazon.com/reports/2021-06-30/reports/${reportId}`,
      { headers: { "x-amz-access-token": accessToken } }
    );
    const report = await pollRes.json();

    if (report.processingStatus === "DONE") {
      reportDocumentId = report.reportDocumentId;
      break;
    } else if (report.processingStatus === "CANCELLED" || report.processingStatus === "FATAL") {
      throw new Error(`Report ${reportId} failed: ${report.processingStatus}`);
    }
    // IN_QUEUE or IN_PROGRESS — keep polling
  }

  if (!reportDocumentId) {
    throw new Error(`Report ${reportId} timed out after 5 minutes`);
  }

  // 3. Get the download URL
  const docRes = await fetch(
    `https://sellingpartnerapi-na.amazon.com/reports/2021-06-30/documents/${reportDocumentId}`,
    { headers: { "x-amz-access-token": accessToken } }
  );
  const docData = await docRes.json();
  const downloadUrl = docData.url;

  // 4. Download and parse the TSV
  const tsvRes = await fetch(downloadUrl);
  const tsvText = await tsvRes.text();
  const lines = tsvText.trim().split("\n");

  if (lines.length < 2) {
    console.log("[Amazon Products] Report returned no listings");
    return { status: "completed", updated: 0 };
  }

  // Parse header to find column indices
  const headers = lines[0].split("\t").map((h) => h.trim().toLowerCase());
  const col = (name: string) => headers.indexOf(name);
  const skuIdx = col("seller-sku");
  const asinIdx = col("asin1");
  const titleIdx = col("item-name");
  const statusIdx = col("status");

  if (skuIdx === -1 || asinIdx === -1 || titleIdx === -1) {
    console.error("[Amazon Products] Unexpected report columns:", headers.join(", "));
    throw new Error("Could not find required columns in report");
  }

  // 5. Upsert active listings into products table
  let updated = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const sku = cols[skuIdx]?.trim();
    const asin = cols[asinIdx]?.trim();
    const title = cols[titleIdx]?.trim();
    const status = statusIdx >= 0 ? cols[statusIdx]?.trim().toLowerCase() : "active";

    if (!sku || !asin || status !== "active") continue;

    try {
      await db
        .insert(products)
        .values({
          sku,
          asin,
          productTitle: title || sku,
          channels: ["amazon"],
        })
        .onConflictDoUpdate({
          target: [products.sku],
          set: {
            asin: sql`EXCLUDED.asin`,
            productTitle: sql`EXCLUDED.product_title`,
            channels: sql`
              CASE
                WHEN NOT ('amazon' = ANY(${products.channels}))
                THEN array_append(${products.channels}, 'amazon')
                ELSE ${products.channels}
              END
            `,
          },
        });
      updated++;
    } catch (err: any) {
      console.error(`[Amazon Products] Error for ${sku}: ${err.message}`);
      errors.push(`${sku}: ${err.message}`);
    }
  }

  console.log(`[Amazon Products] Done: ${updated} products upserted, ${errors.length} errors`);
  return { status: "completed", updated, errors };
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

  let retries = 0;
  while (retries < 3) {
    const res = await fetch(
      `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics?${params}`,
      {
        headers: {
          "x-amz-access-token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (res.status === 429) {
      retries++;
      const wait = retries * 5_000; // back off: 5s, 10s, 15s
      console.warn(`SP-API rate limited for ${asin}, retrying in ${wait / 1000}s...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(`SP-API error for ${asin} (${buyerType}): HTTP ${res.status} — ${text.slice(0, 500)}`);
      return [];
    }

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data.payload || [];
    } catch {
      console.error(`SP-API parse error for ${asin} (${buyerType}): response was not JSON — ${text.slice(0, 500)}`);
      return [];
    }
  }

  console.error(`SP-API gave up on ${asin} after 3 retries (rate limited)`);
  return [];
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

  for (let i = 0; i < allProducts.length; i++) {
    const product = allProducts[i];
    if (!product.asin) continue;

    // Pace requests to stay under SP-API rate limits (~1 req/sec for sales endpoint)
    if (i > 0) await new Promise((r) => setTimeout(r, 2_000));

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
            brandId: product.brandId ?? 1,
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
      console.error(`[Amazon SP-API] Error for ${product.asin}: ${err.message}`);
      errors.push(`${product.asin}: ${err.message}`);
    }
  }

  console.log(`[Amazon SP-API] Done: ${updated} rows upserted, ${errors.length} errors`);
  return { status: "completed", updated, errors };
}
