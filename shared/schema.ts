import {
  pgSchema,
  text,
  integer,
  serial,
  real,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// All tables namespaced under pl_dashboard schema (shared DB with NeuroganERP)
export const plDashboard = pgSchema("pl_dashboard");

// ─── Auth ──────────────────────────────────────────────────────────────────

export const users = plDashboard.table("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Products ──────────────────────────────────────────────────────────────

export const products = plDashboard.table(
  "products",
  {
    id: serial("id").primaryKey(),
    sku: text("sku").notNull(),
    asin: text("asin"),
    productTitle: text("product_title").notNull(),
    channels: text("channels").array(),
    isCore29: boolean("is_core_29").default(false),
  },
  (table) => [uniqueIndex("products_sku_idx").on(table.sku)]
);

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// ─── Weekly Metrics (per product, per channel, per week) ───────────────────

export const weeklyMetrics = plDashboard.table(
  "weekly_metrics",
  {
    id: serial("id").primaryKey(),
    sku: text("sku").notNull(),
    asin: text("asin"),
    channel: text("channel").notNull(), // "amazon", "shopify_dtc", "faire"
    weekStartDate: text("week_start_date").notNull(),
    weekEndDate: text("week_end_date"),
    productTitle: text("product_title"),
    // Sales
    revenue: real("revenue").notNull().default(0),
    unitsSold: integer("units_sold").notNull().default(0),
    orderCount: integer("order_count").notNull().default(0),
    avgUnitPrice: real("avg_unit_price"),
    // COGS
    cogsPerUnit: real("cogs_per_unit"),
    totalCogs: real("total_cogs"),
    hasCogs: boolean("has_cogs").default(false),
    // Amazon fees (from settlement data)
    amazonReferralFee: real("amazon_referral_fee"),
    fbaFulfillmentFee: real("fba_fulfillment_fee"),
    promotions: real("promotions"),
    refundAmount: real("refund_amount"),
    shippingChargeback: real("shipping_chargeback"),
    refundCommission: real("refund_commission"),
    otherFees: real("other_fees"),
    reimbursement: real("reimbursement"),
    totalAmazonFees: real("total_amazon_fees"),
    feeSource: text("fee_source"), // "settlement" | "estimated"
    // Shopify fees
    paymentFees: real("payment_fees"),
    // Net
    netProceeds: real("net_proceeds"),
    netProfit: real("net_profit"),
    netProfitComplete: boolean("net_profit_complete").default(false),
    // Advertising
    adSpend: real("ad_spend"),
    adImpressions: integer("ad_impressions"),
    adClicks: integer("ad_clicks"),
    adOrders: integer("ad_orders"),
    adSales: real("ad_sales"),
    acos: real("acos"),
    tacos: real("tacos"),
    hasAdData: boolean("has_ad_data").default(false),
    organicSales: real("organic_sales"),
    // B2B / B2C (Amazon only)
    b2bRevenue: real("b2b_revenue"),
    b2bUnits: integer("b2b_units"),
    b2bOrders: integer("b2b_orders"),
    b2cRevenue: real("b2c_revenue"),
    b2cUnits: integer("b2c_units"),
    b2cOrders: integer("b2c_orders"),
    // Derived metrics
    avgUnitsPerOrder: real("avg_units_per_order"),
    revenuePerOrder: real("revenue_per_order"),
    refundRate: real("refund_rate"),
    refundUnits: integer("refund_units"),
    // Placeholders for future integrations
    sessions: integer("sessions"),
    pageViews: integer("page_views"),
    conversionRate: real("conversion_rate"),
    activeSubscriptions: integer("active_subscriptions"),
  },
  (table) => [
    uniqueIndex("wm_sku_week_channel_idx").on(
      table.sku,
      table.weekStartDate,
      table.channel
    ),
    index("wm_week_idx").on(table.weekStartDate),
    index("wm_channel_idx").on(table.channel),
    index("wm_sku_idx").on(table.sku),
  ]
);

export const insertWeeklyMetricSchema = createInsertSchema(weeklyMetrics).omit({
  id: true,
});
export type InsertWeeklyMetric = z.infer<typeof insertWeeklyMetricSchema>;
export type WeeklyMetric = typeof weeklyMetrics.$inferSelect;

// ─── COGS Periods ──────────────────────────────────────────────────────────

export const cogsPeriods = plDashboard.table("cogs_periods", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull(),
  asin: text("asin"),
  startsDate: text("starts_date").notNull(),
  endsDate: text("ends_date"),
  productCost: real("product_cost"),
  shippingCost: real("shipping_cost"),
  tariffs: real("tariffs"),
  totalCogs: real("total_cogs").notNull(),
});

export const insertCogsPeriodSchema = createInsertSchema(cogsPeriods).omit({
  id: true,
});
export type InsertCogsPeriod = z.infer<typeof insertCogsPeriodSchema>;
export type CogsPeriod = typeof cogsPeriods.$inferSelect;

// ─── Ad Weekly Summary (per ASIN per week) ─────────────────────────────────

export const adWeeklySummary = plDashboard.table(
  "ad_weekly_summary",
  {
    id: serial("id").primaryKey(),
    asin: text("asin").notNull(),
    weekStartDate: text("week_start_date").notNull(),
    spend: real("spend").notNull().default(0),
    impressions: integer("impressions").default(0),
    clicks: integer("clicks").default(0),
    orders: integer("orders").default(0),
    adSales: real("ad_sales").default(0),
    acos: real("acos"),
    tacos: real("tacos"),
    totalRevenue: real("total_revenue"),
  },
  (table) => [
    uniqueIndex("ad_asin_week_idx").on(table.asin, table.weekStartDate),
  ]
);

export const insertAdWeeklySummarySchema = createInsertSchema(
  adWeeklySummary
).omit({ id: true });
export type InsertAdWeeklySummary = z.infer<typeof insertAdWeeklySummarySchema>;
export type AdWeeklySummary = typeof adWeeklySummary.$inferSelect;
