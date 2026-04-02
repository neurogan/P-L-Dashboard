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

const BATCH_SIZE = 500;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const jsonPath = path.resolve(
    import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
    "..",
    "client",
    "src",
    "data",
    "dashboard-data.json",
  );

  console.log("Reading JSON data...");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data: JsonData = JSON.parse(raw);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Ensure schema exists
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS pl_dashboard`);

  console.log(`Data loaded: ${data.allProducts.length} products, ${data.weeklyFacts.length} weeklyFacts, ${data.shopifyFacts.length} shopifyFacts, ${data.cogsPeriods.length} cogsPeriods, ${data.adWeeklySummary.length} adWeeklySummary`);

  // ─── 1. Seed products (from allProducts — the superset) ────────────────

  console.log(`Seeding ${data.allProducts.length} products...`);
  const productBatch = data.allProducts.map((p) => ({
    sku: p.sku,
    asin: p.asin,
    productTitle: p.productTitle,
    channels: p.channels,
    isCore29: data.products.some((cp) => cp.sku === p.sku),
  }));

  for (let i = 0; i < productBatch.length; i += BATCH_SIZE) {
    const batch = productBatch.slice(i, i + BATCH_SIZE);
    await db.insert(products).values(batch).onConflictDoUpdate({
      target: products.sku,
      set: {
        asin: sql`excluded.asin`,
        productTitle: sql`excluded.product_title`,
        channels: sql`excluded.channels`,
        isCore29: sql`excluded.is_core_29`,
      },
    });
  }
  console.log(`  ✓ ${productBatch.length} products upserted`);

  // ─── 2. Seed weekly_metrics from Amazon weeklyFacts ─────────────────────

  console.log(`Seeding ${data.weeklyFacts.length} Amazon weekly metrics...`);

  for (let i = 0; i < data.weeklyFacts.length; i += BATCH_SIZE) {
    const batch = data.weeklyFacts.slice(i, i + BATCH_SIZE).map((f) => ({
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
    }));

    await db.insert(weeklyMetrics).values(batch).onConflictDoUpdate({
      target: [weeklyMetrics.sku, weeklyMetrics.weekStartDate, weeklyMetrics.channel],
      set: {
        asin: sql`excluded.asin`,
        weekEndDate: sql`excluded.week_end_date`,
        productTitle: sql`excluded.product_title`,
        isCore29: sql`excluded.is_core_29`,
        revenue: sql`excluded.revenue`,
        unitsSold: sql`excluded.units_sold`,
        orderCount: sql`excluded.order_count`,
        avgUnitPrice: sql`excluded.avg_unit_price`,
        cogsPerUnit: sql`excluded.cogs_per_unit`,
        totalCogs: sql`excluded.total_cogs`,
        hasCogs: sql`excluded.has_cogs`,
        amazonReferralFee: sql`excluded.amazon_referral_fee`,
        fbaFulfillmentFee: sql`excluded.fba_fulfillment_fee`,
        promotions: sql`excluded.promotions`,
        refundAmount: sql`excluded.refund_amount`,
        shippingChargeback: sql`excluded.shipping_chargeback`,
        refundCommission: sql`excluded.refund_commission`,
        otherFees: sql`excluded.other_fees`,
        reimbursement: sql`excluded.reimbursement`,
        totalAmazonFees: sql`excluded.total_amazon_fees`,
        feeSource: sql`excluded.fee_source`,
        netProceeds: sql`excluded.net_proceeds`,
        netProfit: sql`excluded.net_profit`,
        netProfitComplete: sql`excluded.net_profit_complete`,
        adSpend: sql`excluded.ad_spend`,
        adImpressions: sql`excluded.ad_impressions`,
        adClicks: sql`excluded.ad_clicks`,
        adOrders: sql`excluded.ad_orders`,
        adSales: sql`excluded.ad_sales`,
        acos: sql`excluded.acos`,
        tacos: sql`excluded.tacos`,
        hasAdData: sql`excluded.has_ad_data`,
        organicSales: sql`excluded.organic_sales`,
        b2bRevenue: sql`excluded.b2b_revenue`,
        b2bUnits: sql`excluded.b2b_units`,
        b2bOrders: sql`excluded.b2b_orders`,
        b2cRevenue: sql`excluded.b2c_revenue`,
        b2cUnits: sql`excluded.b2c_units`,
        b2cOrders: sql`excluded.b2c_orders`,
        avgUnitsPerOrder: sql`excluded.avg_units_per_order`,
        revenuePerOrder: sql`excluded.revenue_per_order`,
        refundRate: sql`excluded.refund_rate`,
        refundUnits: sql`excluded.refund_units`,
        sessions: sql`excluded.sessions`,
        pageViews: sql`excluded.page_views`,
        conversionRate: sql`excluded.conversion_rate`,
        activeSubscriptions: sql`excluded.active_subscriptions`,
      },
    });

    console.log(`  Amazon: ${Math.min(i + BATCH_SIZE, data.weeklyFacts.length)}/${data.weeklyFacts.length}`);
  }

  // ─── 3. Seed weekly_metrics from Shopify/Faire shopifyFacts ─────────────

  console.log(`Seeding ${data.shopifyFacts.length} Shopify/Faire weekly metrics...`);

  for (let i = 0; i < data.shopifyFacts.length; i += BATCH_SIZE) {
    const batch = data.shopifyFacts.slice(i, i + BATCH_SIZE).map((f) => ({
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
    }));

    await db.insert(weeklyMetrics).values(batch).onConflictDoUpdate({
      target: [weeklyMetrics.sku, weeklyMetrics.weekStartDate, weeklyMetrics.channel],
      set: {
        productTitle: sql`excluded.product_title`,
        revenue: sql`excluded.revenue`,
        unitsSold: sql`excluded.units_sold`,
        orderCount: sql`excluded.order_count`,
        avgUnitPrice: sql`excluded.avg_unit_price`,
        cogsPerUnit: sql`excluded.cogs_per_unit`,
        totalCogs: sql`excluded.total_cogs`,
        hasCogs: sql`excluded.has_cogs`,
        paymentFees: sql`excluded.payment_fees`,
        netProceeds: sql`excluded.net_proceeds`,
        netProfit: sql`excluded.net_profit`,
        feeSource: sql`excluded.fee_source`,
        avgUnitsPerOrder: sql`excluded.avg_units_per_order`,
        revenuePerOrder: sql`excluded.revenue_per_order`,
        sessions: sql`excluded.sessions`,
        conversionRate: sql`excluded.conversion_rate`,
        activeSubscriptions: sql`excluded.active_subscriptions`,
      },
    });

    console.log(`  Shopify/Faire: ${Math.min(i + BATCH_SIZE, data.shopifyFacts.length)}/${data.shopifyFacts.length}`);
  }

  // ─── 4. Seed cogs_periods ───────────────────────────────────────────────

  console.log(`Seeding ${data.cogsPeriods.length} COGS periods...`);
  await db.delete(cogsPeriods);

  for (let i = 0; i < data.cogsPeriods.length; i += BATCH_SIZE) {
    const batch = data.cogsPeriods.slice(i, i + BATCH_SIZE).map((c) => ({
      sku: c.sku as string,
      asin: c.asin as string | null,
      startsDate: c.starts_date as string,
      endsDate: c.ends_date as string | null,
      productCost: c.product_cost as number | null,
      shippingCost: c.shipping_cost as number | null,
      tariffs: c.tariffs as number | null,
      totalCogs: c.total_cogs as number,
    }));
    await db.insert(cogsPeriods).values(batch);
  }
  console.log(`  ✓ ${data.cogsPeriods.length} COGS periods inserted`);

  // ─── 5. Seed ad_weekly_summary (from asinBreakdown in each week) ───────

  console.log("Seeding ad weekly summary...");
  const adRows: Array<Record<string, any>> = [];

  for (const week of data.adWeeklySummary) {
    for (const ab of week.asinBreakdown) {
      adRows.push({
        asin: ab.asin,
        sku: ab.sku,
        productTitle: ab.productTitle,
        weekStartDate: week.week,
        spend: ab.spend,
        impressions: ab.impressions,
        clicks: ab.clicks,
        orders: ab.orders,
        adSales: ab.adSales,
        acos: ab.acos,
        tacos: ab.tacos,
        totalRevenue: ab.totalRevenue,
      });
    }
  }

  for (let i = 0; i < adRows.length; i += BATCH_SIZE) {
    const batch = adRows.slice(i, i + BATCH_SIZE);
    await db.insert(adWeeklySummary).values(batch).onConflictDoUpdate({
      target: [adWeeklySummary.asin, adWeeklySummary.weekStartDate],
      set: {
        sku: sql`excluded.sku`,
        productTitle: sql`excluded.product_title`,
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
  }
  console.log(`  ✓ ${adRows.length} ad ASIN-weeks upserted`);

  // ─── 6. Seed dashboard_meta ─────────────────────────────────────────────

  console.log("Seeding metadata...");
  const metaEntries = [
    { key: "dateRange.oldest", value: data.dateRange.oldest },
    { key: "dateRange.newest", value: data.dateRange.newest },
    { key: "generatedAt", value: data.generatedAt },
    { key: "meta", value: JSON.stringify(data.meta) },
  ];

  for (const entry of metaEntries) {
    await db.insert(dashboardMeta).values(entry).onConflictDoUpdate({
      target: dashboardMeta.key,
      set: { value: sql`excluded.value` },
    });
  }
  console.log(`  ✓ ${metaEntries.length} metadata entries upserted`);

  // ─── Done ───────────────────────────────────────────────────────────────

  console.log("\nSeed complete!");
  console.log(`  Products:       ${data.allProducts.length}`);
  console.log(`  Amazon metrics: ${data.weeklyFacts.length}`);
  console.log(`  Shopify/Faire:  ${data.shopifyFacts.length}`);
  console.log(`  COGS periods:   ${data.cogsPeriods.length}`);
  console.log(`  Ad ASIN-weeks:  ${adRows.length}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
