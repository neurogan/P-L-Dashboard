/**
 * One-time migration script: reads the static dashboard-data.json
 * and loads it into the PostgreSQL tables.
 *
 * Usage: DATABASE_URL=postgresql://... npx tsx script/seed-from-json.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import {
  products,
  weeklyMetrics,
  cogsPeriods as cogsPeriodsTable,
  adWeeklySummary,
} from "../shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  console.log("Reading dashboard-data.json...");
  const dataPath = resolve(__dirname, "../client/src/data/dashboard-data.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf-8"));

  // Ensure schema exists
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS pl_dashboard`);

  // ── 1. Seed products ──────────────────────────────────────────────────
  console.log(`Seeding ${raw.allProducts.length} products...`);
  for (const p of raw.allProducts) {
    await db
      .insert(products)
      .values({
        sku: p.sku,
        asin: p.asin || null,
        productTitle: p.productTitle,
        channels: p.channels || [],
        isCore29: p.isCore29 ?? false,
      })
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          asin: sql`EXCLUDED.asin`,
          productTitle: sql`EXCLUDED.product_title`,
          channels: sql`EXCLUDED.channels`,
          isCore29: sql`EXCLUDED.is_core_29`,
        },
      });
  }
  console.log("  Products done.");

  // ── 2. Seed Amazon weekly metrics ─────────────────────────────────────
  console.log(`Seeding ${raw.weeklyFacts.length} Amazon weekly facts...`);
  let amazonCount = 0;
  for (const f of raw.weeklyFacts) {
    await db
      .insert(weeklyMetrics)
      .values({
        sku: f.sku,
        asin: f.asin || null,
        channel: f.channel || "amazon",
        weekStartDate: f.weekStartDate,
        weekEndDate: f.weekEndDate || null,
        productTitle: f.productTitle || null,
        revenue: f.revenue,
        unitsSold: f.unitsSold,
        orderCount: f.orderCount,
        avgUnitPrice: f.avgUnitPrice ?? null,
        cogsPerUnit: f.cogsPerUnit ?? null,
        totalCogs: f.totalCogs ?? null,
        hasCogs: f.hasCogs ?? false,
        amazonReferralFee: f.amazonReferralFee ?? null,
        fbaFulfillmentFee: f.fbaFulfillmentFee ?? null,
        promotions: f.promotions ?? null,
        refundAmount: f.refundAmount ?? null,
        shippingChargeback: f.shippingChargeback ?? null,
        refundCommission: f.refundCommission ?? null,
        otherFees: f.otherFees ?? null,
        reimbursement: f.reimbursement ?? null,
        totalAmazonFees: f.totalAmazonFees ?? null,
        feeSource: f.feeSource ?? null,
        paymentFees: null,
        netProceeds: f.netProceeds ?? null,
        netProfit: f.netProfit ?? null,
        netProfitComplete: f.netProfitComplete ?? false,
        adSpend: f.adSpend ?? null,
        adImpressions: f.adImpressions ?? null,
        adClicks: f.adClicks ?? null,
        adOrders: f.adOrders ?? null,
        adSales: f.adSales ?? null,
        acos: f.acos ?? null,
        tacos: f.tacos ?? null,
        hasAdData: f.hasAdData ?? false,
        organicSales: f.organicSales ?? null,
        b2bRevenue: f.b2bRevenue ?? null,
        b2bUnits: f.b2bUnits ?? null,
        b2bOrders: f.b2bOrders ?? null,
        b2cRevenue: f.b2cRevenue ?? null,
        b2cUnits: f.b2cUnits ?? null,
        b2cOrders: f.b2cOrders ?? null,
        avgUnitsPerOrder: f.avgUnitsPerOrder ?? null,
        revenuePerOrder: f.revenuePerOrder ?? null,
        refundRate: f.refundRate ?? null,
        refundUnits: f.refundUnits ?? null,
        sessions: f.sessions ?? null,
        pageViews: f.pageViews ?? null,
        conversionRate: f.conversionRate ?? null,
        activeSubscriptions: f.activeSubscriptions ?? null,
      })
      .onConflictDoUpdate({
        target: [
          weeklyMetrics.sku,
          weeklyMetrics.weekStartDate,
          weeklyMetrics.channel,
        ],
        set: {
          revenue: sql`EXCLUDED.revenue`,
          unitsSold: sql`EXCLUDED.units_sold`,
          orderCount: sql`EXCLUDED.order_count`,
          netProfit: sql`EXCLUDED.net_profit`,
        },
      });
    amazonCount++;
    if (amazonCount % 500 === 0)
      console.log(`  ... ${amazonCount} Amazon facts`);
  }
  console.log(`  Amazon facts done: ${amazonCount}`);

  // ── 3. Seed Shopify/Faire weekly metrics ──────────────────────────────
  const shopifyFacts = raw.shopifyFacts || [];
  console.log(`Seeding ${shopifyFacts.length} Shopify/Faire weekly facts...`);
  let shopifyCount = 0;
  for (const f of shopifyFacts) {
    await db
      .insert(weeklyMetrics)
      .values({
        sku: f.sku,
        asin: null,
        channel: f.channel,
        weekStartDate: f.weekStartDate,
        weekEndDate: null,
        productTitle: f.productTitle || null,
        revenue: f.revenue,
        unitsSold: f.unitsSold,
        orderCount: f.orderCount,
        avgUnitPrice: f.avgUnitPrice ?? null,
        cogsPerUnit: f.cogsPerUnit ?? null,
        totalCogs: f.totalCogs ?? null,
        hasCogs: f.hasCogs ?? false,
        paymentFees: f.paymentFees ?? null,
        netProceeds: f.netProceeds ?? null,
        netProfit: f.netProfit ?? null,
        feeSource: f.feeSource ?? "calculated",
        avgUnitsPerOrder: f.avgUnitsPerOrder ?? null,
        revenuePerOrder: f.revenuePerOrder ?? null,
      })
      .onConflictDoUpdate({
        target: [
          weeklyMetrics.sku,
          weeklyMetrics.weekStartDate,
          weeklyMetrics.channel,
        ],
        set: {
          revenue: sql`EXCLUDED.revenue`,
          unitsSold: sql`EXCLUDED.units_sold`,
          orderCount: sql`EXCLUDED.order_count`,
          netProfit: sql`EXCLUDED.net_profit`,
        },
      });
    shopifyCount++;
    if (shopifyCount % 500 === 0)
      console.log(`  ... ${shopifyCount} Shopify/Faire facts`);
  }
  console.log(`  Shopify/Faire facts done: ${shopifyCount}`);

  // ── 4. Seed COGS periods ──────────────────────────────────────────────
  const cogsList = raw.cogsPeriods || [];
  console.log(`Seeding ${cogsList.length} COGS periods...`);
  for (const c of cogsList) {
    await db.insert(cogsPeriodsTable).values({
      sku: c.sku,
      asin: c.asin || null,
      startsDate: c.starts_date,
      endsDate: c.ends_date || null,
      productCost: c.product_cost ?? null,
      shippingCost: c.shipping_cost ?? null,
      tariffs: c.tariffs ?? null,
      totalCogs: c.total_cogs,
    });
  }
  console.log("  COGS periods done.");

  // ── 5. Seed ad weekly summary ─────────────────────────────────────────
  const adSummaries = raw.adWeeklySummary || [];
  let adCount = 0;
  for (const week of adSummaries) {
    const breakdown = week.asinBreakdown || [];
    for (const b of breakdown) {
      await db
        .insert(adWeeklySummary)
        .values({
          asin: b.asin,
          weekStartDate: week.week,
          spend: b.spend ?? 0,
          impressions: b.impressions ?? 0,
          clicks: b.clicks ?? 0,
          orders: b.orders ?? 0,
          adSales: b.adSales ?? 0,
          acos: b.acos ?? null,
          tacos: b.tacos ?? null,
          totalRevenue: b.totalRevenue ?? null,
        })
        .onConflictDoUpdate({
          target: [adWeeklySummary.asin, adWeeklySummary.weekStartDate],
          set: {
            spend: sql`EXCLUDED.spend`,
            adSales: sql`EXCLUDED.ad_sales`,
          },
        });
      adCount++;
    }
  }
  console.log(`  Ad weekly summary done: ${adCount} rows`);

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n=== Seed Complete ===");
  console.log(`  Products: ${raw.allProducts.length}`);
  console.log(`  Amazon weekly facts: ${amazonCount}`);
  console.log(`  Shopify/Faire weekly facts: ${shopifyCount}`);
  console.log(`  COGS periods: ${cogsList.length}`);
  console.log(`  Ad summary rows: ${adCount}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
