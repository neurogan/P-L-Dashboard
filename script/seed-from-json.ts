/**
 * Seed PostgreSQL from the static dashboard-data.json bundle.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx script/seed-from-json.ts
 *
 * Idempotent — uses ON CONFLICT DO UPDATE (upsert) for all tables.
 */
import fs from "fs";
import path from "path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import {
  products,
  weeklyMetrics,
  cogsPeriods,
  adWeeklySummary,
  dashboardMeta,
} from "../shared/schema";

const JSON_PATH = path.resolve(
  import.meta.dirname,
  "..",
  "client",
  "src",
  "data",
  "dashboard-data.json",
);

interface JsonData {
  products: Array<{
    asin: string;
    sku: string;
    productTitle: string;
    isCore29: boolean;
  }>;
  weeklyFacts: Array<Record<string, any>>;
  shopifyFacts: Array<Record<string, any>>;
  allProducts: Array<{
    sku: string;
    asin: string | null;
    productTitle: string;
    channels: string[];
  }>;
  cogsPeriods: Array<Record<string, any>>;
  adWeeklySummary: Array<{
    week: string;
    totalSpend: number;
    totalAdSales: number;
    totalClicks: number;
    totalImpressions: number;
    totalOrders: number;
    acos: number;
    asinBreakdown: Array<Record<string, any>>;
  }>;
  meta: Record<string, any>;
  dateRange: { oldest: string; newest: string };
  generatedAt: string;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("Reading JSON data...");
  const raw = fs.readFileSync(JSON_PATH, "utf-8");
  const data: JsonData = JSON.parse(raw);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Ensure schema exists
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS pl_dashboard`);

  // ─── 1. Seed products (from allProducts — the superset) ────────────────

  console.log(`Seeding ${data.allProducts.length} products...`);
  const productBatch = data.allProducts.map((p) => ({
    sku: p.sku,
    asin: p.asin,
    productTitle: p.productTitle,
    channels: p.channels,
    isCore29: data.products.some((cp) => cp.sku === p.sku),
  }));

  for (const row of productBatch) {
    await db
      .insert(products)
      .values(row)
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          asin: row.asin,
          productTitle: row.productTitle,
          channels: row.channels,
          isCore29: row.isCore29,
        },
      });
  }
  console.log("  Products done.");

  // ─── 2. Seed weekly_metrics from Amazon weeklyFacts ─────────────────────

  console.log(`Seeding ${data.weeklyFacts.length} Amazon weekly metrics...`);
  const BATCH_SIZE = 200;

  for (let i = 0; i < data.weeklyFacts.length; i += BATCH_SIZE) {
    const batch = data.weeklyFacts.slice(i, i + BATCH_SIZE);
    for (const f of batch) {
      const row = {
        sku: f.sku as string,
        asin: f.asin as string,
        channel: (f.channel || "amazon") as string,
        weekStartDate: f.weekStartDate as string,
        weekEndDate: f.weekEndDate as string | undefined,
        productTitle: f.productTitle as string,
        isCore29: f.isCore29 as boolean,
        revenue: f.revenue as number,
        unitsSold: f.unitsSold as number,
        orderCount: f.orderCount as number,
        avgUnitPrice: f.avgUnitPrice as number | null,
        cogsPerUnit: f.cogsPerUnit as number | null,
        totalCogs: f.totalCogs as number | null,
        hasCogs: f.hasCogs as boolean,
        amazonReferralFee: f.amazonReferralFee as number | null,
        fbaFulfillmentFee: f.fbaFulfillmentFee as number | null,
        promotions: f.promotions as number | null,
        refundAmount: f.refundAmount as number | null,
        shippingChargeback: f.shippingChargeback as number | null,
        refundCommission: f.refundCommission as number | null,
        otherFees: f.otherFees as number | null,
        reimbursement: f.reimbursement as number | null,
        totalAmazonFees: f.totalAmazonFees as number | null,
        feeSource: f.feeSource as string | null,
        netProceeds: f.netProceeds as number | null,
        netProfit: f.netProfit as number | null,
        netProfitComplete: f.netProfitComplete as boolean,
        adSpend: f.adSpend as number | null,
        adImpressions: f.adImpressions as number | null,
        adClicks: f.adClicks as number | null,
        adOrders: f.adOrders as number | null,
        adSales: f.adSales as number | null,
        acos: f.acos as number | null,
        tacos: f.tacos as number | null,
        hasAdData: f.hasAdData as boolean,
        organicSales: f.organicSales as number | null,
        b2bRevenue: f.b2bRevenue as number | null,
        b2bUnits: f.b2bUnits as number | null,
        b2bOrders: f.b2bOrders as number | null,
        b2cRevenue: f.b2cRevenue as number | null,
        b2cUnits: f.b2cUnits as number | null,
        b2cOrders: f.b2cOrders as number | null,
        avgUnitsPerOrder: f.avgUnitsPerOrder as number | null,
        revenuePerOrder: f.revenuePerOrder as number | null,
        refundRate: f.refundRate as number | null,
        refundUnits: f.refundUnits as number | null,
        sessions: f.sessions as number | null,
        pageViews: f.pageViews as number | null,
        conversionRate: f.conversionRate as number | null,
        activeSubscriptions: f.activeSubscriptions as number | null,
      };

      await db
        .insert(weeklyMetrics)
        .values(row)
        .onConflictDoUpdate({
          target: [weeklyMetrics.sku, weeklyMetrics.weekStartDate, weeklyMetrics.channel],
          set: row,
        });
    }

    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= data.weeklyFacts.length) {
      console.log(`  Amazon: ${Math.min(i + BATCH_SIZE, data.weeklyFacts.length)}/${data.weeklyFacts.length}`);
    }
  }

  // ─── 3. Seed weekly_metrics from Shopify/Faire shopifyFacts ─────────────

  console.log(`Seeding ${data.shopifyFacts.length} Shopify/Faire weekly metrics...`);

  for (let i = 0; i < data.shopifyFacts.length; i += BATCH_SIZE) {
    const batch = data.shopifyFacts.slice(i, i + BATCH_SIZE);
    for (const f of batch) {
      const row = {
        sku: f.sku as string,
        asin: null as string | null,
        channel: f.channel as string,
        weekStartDate: f.weekStartDate as string,
        weekEndDate: null as string | null,
        productTitle: f.productTitle as string,
        isCore29: false,
        revenue: f.revenue as number,
        unitsSold: f.unitsSold as number,
        orderCount: f.orderCount as number,
        avgUnitPrice: f.avgUnitPrice as number | null,
        cogsPerUnit: f.cogsPerUnit as number | null,
        totalCogs: f.totalCogs as number | null,
        hasCogs: f.hasCogs as boolean,
        paymentFees: f.paymentFees as number,
        netProceeds: f.netProceeds as number,
        netProfit: f.netProfit as number | null,
        feeSource: f.feeSource as string | null,
        avgUnitsPerOrder: f.avgUnitsPerOrder as number | null,
        revenuePerOrder: f.revenuePerOrder as number | null,
        sessions: f.sessions as number | null,
        conversionRate: f.conversionRate as number | null,
        activeSubscriptions: f.activeSubscriptions as number | null,
      };

      await db
        .insert(weeklyMetrics)
        .values(row)
        .onConflictDoUpdate({
          target: [weeklyMetrics.sku, weeklyMetrics.weekStartDate, weeklyMetrics.channel],
          set: row,
        });
    }

    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= data.shopifyFacts.length) {
      console.log(`  Shopify/Faire: ${Math.min(i + BATCH_SIZE, data.shopifyFacts.length)}/${data.shopifyFacts.length}`);
    }
  }

  // ─── 4. Seed cogs_periods ───────────────────────────────────────────────

  console.log(`Seeding ${data.cogsPeriods.length} COGS periods...`);

  for (const c of data.cogsPeriods) {
    await db.insert(cogsPeriods).values({
      sku: c.sku as string,
      asin: c.asin as string | null,
      startsDate: c.starts_date as string,
      endsDate: c.ends_date as string | null,
      productCost: c.product_cost as number | null,
      shippingCost: c.shipping_cost as number | null,
      tariffs: c.tariffs as number | null,
      totalCogs: c.total_cogs as number,
    });
  }
  console.log("  COGS periods done.");

  // ─── 5. Seed ad_weekly_summary (from asinBreakdown in each week) ───────

  console.log(`Seeding ad weekly summary...`);
  let adCount = 0;

  for (const week of data.adWeeklySummary) {
    for (const ab of week.asinBreakdown) {
      await db
        .insert(adWeeklySummary)
        .values({
          asin: ab.asin as string,
          sku: ab.sku as string,
          productTitle: ab.productTitle as string,
          weekStartDate: week.week,
          spend: ab.spend as number,
          impressions: ab.impressions as number,
          clicks: ab.clicks as number,
          orders: ab.orders as number,
          adSales: ab.adSales as number,
          acos: ab.acos as number,
          tacos: ab.tacos as number,
          totalRevenue: ab.totalRevenue as number,
        })
        .onConflictDoUpdate({
          target: [adWeeklySummary.asin, adWeeklySummary.weekStartDate],
          set: {
            sku: ab.sku,
            productTitle: ab.productTitle,
            spend: ab.spend,
            impressions: ab.impressions,
            clicks: ab.clicks,
            orders: ab.orders,
            adSales: ab.adSales,
            acos: ab.acos,
            tacos: ab.tacos,
            totalRevenue: ab.totalRevenue,
          },
        });
      adCount++;
    }
  }
  console.log(`  Ad summary done (${adCount} ASIN-weeks).`);

  // ─── 6. Seed dashboard_meta ─────────────────────────────────────────────

  console.log("Seeding metadata...");
  const metaEntries = [
    { key: "dateRange.oldest", value: data.dateRange.oldest },
    { key: "dateRange.newest", value: data.dateRange.newest },
    { key: "generatedAt", value: data.generatedAt },
    { key: "meta.totalAsins", value: String(data.meta.totalAsins) },
    { key: "meta.totalWeeks", value: String(data.meta.totalWeeks) },
    { key: "meta.totalFacts", value: String(data.meta.totalFacts) },
    { key: "meta.salesDataSource", value: data.meta.salesDataSource },
    { key: "meta.adDataSource", value: data.meta.adDataSource },
    { key: "meta.cogsDataSource", value: data.meta.cogsDataSource },
    { key: "meta.sessionsDataSource", value: data.meta.sessionsDataSource },
    { key: "meta.adDataRange", value: data.meta.adDataRange || "" },
    { key: "meta.NO_ESTIMATES", value: String(data.meta.NO_ESTIMATES) },
    { key: "meta.feeDataSource", value: data.meta.feeDataSource || "" },
    { key: "meta.channels", value: JSON.stringify(data.meta.channels || ["amazon", "shopify_dtc", "faire"]) },
  ];

  for (const entry of metaEntries) {
    await db
      .insert(dashboardMeta)
      .values(entry)
      .onConflictDoUpdate({
        target: dashboardMeta.key,
        set: { value: entry.value },
      });
  }
  console.log("  Metadata done.");

  // ─── Done ───────────────────────────────────────────────────────────────

  console.log("\nSeed complete!");
  console.log(`  Products:       ${data.allProducts.length}`);
  console.log(`  Amazon metrics: ${data.weeklyFacts.length}`);
  console.log(`  Shopify/Faire:  ${data.shopifyFacts.length}`);
  console.log(`  COGS periods:   ${data.cogsPeriods.length}`);
  console.log(`  Ad ASIN-weeks:  ${adCount}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
