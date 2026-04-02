/**
 * Data types, formatting helpers, constants, and pure computation functions.
 * Data fetching is now done via React Query hooks in api.ts.
 *
 * NOTE: The static JSON import has been removed. All data now comes from
 * the PostgreSQL backend via /api/* endpoints.
 */

// ─── Re-export API hooks for convenience ─────────────────────────────────
export {
  useMeta,
  useOverview,
  useChannelMix,
  useProducts,
  useUnifiedProducts,
  useWeeklyChart,
  useHeroChart,
  useProductWeeklyRevenue,
  useChannelHero,
  useProductDetail,
  useAdvertising,
  usePareto,
  useProductsCatalog,
  useCogsPeriods,
} from "./api";

export type {
  MetaData,
  OverviewData,
  ChannelMixRow,
  ApiProductRow,
  UnifiedProductRow as ApiUnifiedProductRow,
  WeeklyChartRow,
  HeroChartRow,
  ChannelHeroRow,
  ProductDetailData,
  AdData,
  ParetoProduct,
  CatalogProduct,
} from "./api";

// ─── Raw types (kept for component compatibility) ────────────────────────

export interface Product {
  asin: string;
  sku: string;
  productTitle: string;
  isCore29: boolean;
}

export interface WeeklyFact {
  asin: string;
  sku: string;
  productTitle: string;
  weekStartDate: string;
  weekEndDate: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
  avgUnitPrice: number;
  cogsPerUnit: number | null;
  totalCogs: number | null;
  hasCogs: boolean;
  isCore29: boolean;
  adSpend: number | null;
  adImpressions: number | null;
  adClicks: number | null;
  adOrders: number | null;
  adSales: number | null;
  acos: number | null;
  tacos: number | null;
  hasAdData: boolean;
  sessions: number | null;
  pageViews: number | null;
  conversionRate: number | null;
  amazonReferralFee: number | null;
  fbaFulfillmentFee: number | null;
  promotions: number | null;
  refundAmount: number | null;
  shippingChargeback: number | null;
  refundCommission: number | null;
  otherFees: number | null;
  reimbursement: number | null;
  totalAmazonFees: number | null;
  feeSource: "settlement" | "estimated" | null;
  refundUnits: number | null;
  netProceeds: number | null;
  netProfit: number | null;
  netProfitComplete: boolean;
  organicSales: number | null;
  channel: string;
  b2bRevenue: number | null;
  b2bUnits: number | null;
  b2bOrders: number | null;
  b2cRevenue: number | null;
  b2cUnits: number | null;
  b2cOrders: number | null;
  avgUnitsPerOrder: number | null;
  revenuePerOrder: number | null;
  refundRate: number | null;
  activeSubscriptions: number | null;
}

export interface ShopifyFact {
  channel: "shopify_dtc" | "faire";
  sku: string;
  productTitle: string;
  weekStartDate: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
  avgUnitPrice: number;
  cogsPerUnit: number | null;
  totalCogs: number | null;
  hasCogs: boolean;
  paymentFees: number;
  netProceeds: number;
  netProfit: number | null;
  feeSource: string;
  avgUnitsPerOrder: number | null;
  revenuePerOrder: number | null;
  sessions: number | null;
  conversionRate: number | null;
  avgTimeOnPage: number | null;
  activeSubscriptions: number | null;
}

export interface UnifiedHeroRow {
  week: string;
  amazonRevenue: number;
  shopifyRevenue: number;
  faireRevenue: number;
  totalRevenue: number;
  amazonUnits: number;
  shopifyUnits: number;
  faireUnits: number;
  totalUnits: number;
  amazonOrders: number;
  shopifyOrders: number;
  faireOrders: number;
  totalOrders: number;
  amazonNetProfit: number | null;
  shopifyNetProfit: number | null;
  faireNetProfit: number | null;
  totalNetProfit: number | null;
}

export interface AllProduct {
  sku: string;
  asin: string | null;
  productTitle: string;
  channels: string[];
}

export interface AdAsinBreakdown {
  asin: string;
  sku: string;
  productTitle: string;
  spend: number;
  impressions: number;
  clicks: number;
  orders: number;
  adSales: number;
  acos: number;
  tacos: number;
  totalRevenue: number;
}

export interface AdWeeklySummary {
  week: string;
  totalSpend: number;
  totalAdSales: number;
  totalClicks: number;
  totalImpressions: number;
  totalOrders: number;
  acos: number;
  asinBreakdown: AdAsinBreakdown[];
}

// ─── Channel colors ──────────────────────────────────────────────────────
export const CHANNEL_COLORS = {
  amazon: "#2563eb",
  shopify_dtc: "#16a34a",
  faire: "#7c3aed",
} as const;

export const CHANNEL_LABELS: Record<string, string> = {
  amazon: "Amazon",
  shopify_dtc: "Shopify DTC",
  faire: "Faire/Wholesale",
};

export const CHANNEL_BADGE_LABELS: Record<string, string> = {
  amazon: "AMZ",
  shopify_dtc: "SHOP",
  faire: "FAIRE",
};

// ─── 29-product fixed color palette ──────────────────────────────────────
export const PRODUCT_COLORS = [
  "#e63946", "#457b9d", "#f4a261", "#2a9d8f", "#e76f51",
  "#264653", "#a8dadc", "#f1faee", "#606c38", "#dda15e",
  "#bc6c25", "#283618", "#6d6875", "#b5838d", "#ffb4a2",
  "#e5989b", "#cdb4db", "#ffc8dd", "#a2d2ff", "#bde0fe",
  "#8ecae6", "#219ebc", "#023047", "#ffb703", "#fb8500",
  "#8338ec", "#3a86ff", "#ff006e", "#06d6a0",
];

export function getProductColor(asin: string, productList?: { asin: string }[]): string {
  if (!productList) return PRODUCT_COLORS[0];
  const idx = productList.findIndex((p) => p.asin === asin);
  return idx >= 0 ? PRODUCT_COLORS[idx % PRODUCT_COLORS.length] : PRODUCT_COLORS[0];
}

// ─── Formatting helpers ───────────────────────────────────────────────────

export function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value == null) return "—";
  if (compact && Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyPrecise(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatPercentChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Product aggregate types (for Amazon tab) ────────────────────────────

export interface ProductAggregate {
  asin: string;
  sku: string;
  productTitle: string;
  hasCogs: boolean;
  revenue: number;
  totalCogs: number | null;
  totalAmazonFees: number | null;
  netProceeds: number | null;
  adSpend: number | null;
  adSales: number | null;
  netProfit: number | null;
  marginPct: number | null;
  unitsSold: number;
  avgPrice: number;
  feeSource: "settlement" | "estimated" | "mixed" | null;
  orderCount: number;
  refundAmount: number | null;
  tacos: number | null;
  acos: number | null;
  avgUnitsPerOrder: number | null;
  revenuePerOrder: number | null;
  refundRate: number | null;
  b2bRevenue: number | null;
  b2cRevenue: number | null;
  b2bUnits: number | null;
}

// Convert API product rows to ProductAggregate format (for Amazon tab)
export function apiProductsToAggregates(rows: import("./api").ApiProductRow[]): ProductAggregate[] {
  return rows
    .filter((r) => r.channel === "amazon")
    .map((r) => ({
      asin: r.asin || "",
      sku: r.sku,
      productTitle: r.productTitle,
      hasCogs: r.hasCogs,
      revenue: r.revenue,
      totalCogs: r.totalCogs,
      totalAmazonFees: r.totalAmazonFees,
      netProceeds: r.netProceeds,
      adSpend: r.adSpend,
      adSales: r.adSales,
      netProfit: r.netProfit,
      marginPct: r.marginPct,
      unitsSold: r.unitsSold,
      avgPrice: r.avgPrice,
      feeSource: null,
      orderCount: r.orderCount,
      refundAmount: r.refundAmount,
      tacos: r.tacos,
      acos: r.acos,
      avgUnitsPerOrder: r.avgUnitsPerOrder,
      revenuePerOrder: r.revenuePerOrder,
      refundRate: null,
      b2bRevenue: r.b2bRevenue,
      b2cRevenue: r.b2cRevenue,
      b2bUnits: r.b2bUnits,
    }));
}

export function getTotals(products: ProductAggregate[]): ProductAggregate {
  const revenue = products.reduce((s, p) => s + p.revenue, 0);
  const unitsSold = products.reduce((s, p) => s + p.unitsSold, 0);
  const orderCount = products.reduce((s, p) => s + p.orderCount, 0);

  const cogsProducts = products.filter((p) => p.totalCogs != null);
  const totalCogs = cogsProducts.length > 0 ? cogsProducts.reduce((s, p) => s + (p.totalCogs ?? 0), 0) : null;

  const feeProducts = products.filter((p) => p.totalAmazonFees != null);
  const totalAmazonFees = feeProducts.length > 0 ? feeProducts.reduce((s, p) => s + (p.totalAmazonFees ?? 0), 0) : null;

  const npProducts = products.filter((p) => p.netProceeds != null);
  const netProceeds = npProducts.length > 0 ? npProducts.reduce((s, p) => s + (p.netProceeds ?? 0), 0) : null;

  const adProducts = products.filter((p) => p.adSpend != null);
  const adSpend = adProducts.length > 0 ? adProducts.reduce((s, p) => s + (p.adSpend ?? 0), 0) : null;

  const adSalesProducts = products.filter((p) => p.adSales != null);
  const adSales = adSalesProducts.length > 0 ? adSalesProducts.reduce((s, p) => s + (p.adSales ?? 0), 0) : null;

  const profitProducts = products.filter((p) => p.netProfit != null);
  const netProfit = profitProducts.length > 0 ? profitProducts.reduce((s, p) => s + (p.netProfit ?? 0), 0) : null;

  const marginPct = netProfit != null && revenue > 0 ? netProfit / revenue : null;

  const feeSources = new Set(products.map((p) => p.feeSource).filter(Boolean));
  let feeSource: "settlement" | "estimated" | "mixed" | null = null;
  if (feeSources.size === 1) {
    feeSource = feeSources.values().next().value as any;
  } else if (feeSources.size > 1) {
    feeSource = "mixed";
  }

  const refundProducts = products.filter((p) => p.refundAmount != null);
  const refundAmount = refundProducts.length > 0 ? refundProducts.reduce((s, p) => s + (p.refundAmount ?? 0), 0) : null;
  const tacos = adSpend != null && revenue > 0 ? adSpend / revenue : null;
  const acos = adSpend != null && adSales != null && adSales > 0 ? adSpend / adSales : null;

  return {
    asin: "TOTAL", sku: "", productTitle: "All Products", hasCogs: true,
    revenue, totalCogs, totalAmazonFees, netProceeds, adSpend, adSales, netProfit,
    marginPct, unitsSold, avgPrice: unitsSold > 0 ? revenue / unitsSold : 0, feeSource,
    orderCount, refundAmount, tacos, acos,
    avgUnitsPerOrder: orderCount > 0 ? unitsSold / orderCount : null,
    revenuePerOrder: orderCount > 0 ? revenue / orderCount : null,
    refundRate: null, b2bRevenue: null, b2cRevenue: null, b2bUnits: null,
  };
}

// ─── Date presets and period comparison (pure functions) ──────────────────

export type DatePreset = "Last Week" | "Last 4 Weeks" | "Last 12 Weeks" | "Last 26 Weeks" | "YTD" | "All" | "Custom";

export function detectPreset(
  dateRange: { start: string; end: string },
  minDate: string,
  maxDate: string,
): DatePreset {
  const subtractWeeks = (d: string, w: number) => {
    const dt = new Date(d + "T00:00:00");
    dt.setDate(dt.getDate() - w * 7);
    return dt.toISOString().slice(0, 10);
  };
  const ytdStart = `${new Date(maxDate + "T00:00:00").getFullYear()}-01-01`;

  if (dateRange.start === subtractWeeks(maxDate, 1) && dateRange.end === maxDate) return "Last Week";
  if (dateRange.start === subtractWeeks(maxDate, 4) && dateRange.end === maxDate) return "Last 4 Weeks";
  if (dateRange.start === subtractWeeks(maxDate, 12) && dateRange.end === maxDate) return "Last 12 Weeks";
  if (dateRange.start === subtractWeeks(maxDate, 26) && dateRange.end === maxDate) return "Last 26 Weeks";
  if (dateRange.start === ytdStart && dateRange.end === maxDate) return "YTD";
  if (dateRange.start === minDate && dateRange.end === maxDate) return "All";
  return "Custom";
}

export function getPriorPeriod(
  dateRange: { start: string; end: string },
  preset: DatePreset,
): { start: string; end: string; label: string } | null {
  if (preset === "All") return null;

  const startD = new Date(dateRange.start + "T00:00:00");
  const endD = new Date(dateRange.end + "T00:00:00");
  const periodMs = endD.getTime() - startD.getTime();
  const periodDays = Math.round(periodMs / (1000 * 60 * 60 * 24));

  if (preset === "YTD") {
    const priorStart = new Date(startD);
    priorStart.setFullYear(priorStart.getFullYear() - 1);
    const priorEnd = new Date(endD);
    priorEnd.setFullYear(priorEnd.getFullYear() - 1);
    return {
      start: priorStart.toISOString().slice(0, 10),
      end: priorEnd.toISOString().slice(0, 10),
      label: "vs same period last year",
    };
  }

  const priorEnd = new Date(startD.getTime() - 1000 * 60 * 60 * 24);
  const priorStart = new Date(priorEnd.getTime() - periodMs);

  const weeksLabel = Math.round(periodDays / 7);
  let label = `vs prior ${weeksLabel} week${weeksLabel !== 1 ? "s" : ""}`;
  if (preset === "Last Week") label = "vs prior week";

  return {
    start: priorStart.toISOString().slice(0, 10),
    end: priorEnd.toISOString().slice(0, 10),
    label,
  };
}

// ─── Utility: safe percent change ────────────────────────────────────────

export function safePctChange(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

// ─── Gini coefficient (pure math) ────────────────────────────────────────

export function calculateGiniCoefficient(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sorted[i];
  }
  return numerator / (n * total);
}

// ─── Shopify product aggregate type ──────────────────────────────────────

export interface ShopifyProductAggregate {
  sku: string;
  productTitle: string;
  revenue: number;
  paymentFees: number;
  totalCogs: number | null;
  netProceeds: number;
  netProfit: number | null;
  marginPct: number | null;
  unitsSold: number;
  orderCount: number;
  avgPrice: number;
  hasCogs: boolean;
}

// Convert API product rows to ShopifyProductAggregate format
export function apiProductsToShopifyAggregates(
  rows: import("./api").ApiProductRow[],
  channel: "shopify_dtc" | "faire",
): ShopifyProductAggregate[] {
  return rows
    .filter((r) => r.channel === channel)
    .map((r) => ({
      sku: r.sku,
      productTitle: r.productTitle,
      revenue: r.revenue,
      paymentFees: r.paymentFees ?? 0,
      totalCogs: r.totalCogs,
      netProceeds: r.netProceeds ?? r.revenue - (r.paymentFees ?? 0),
      netProfit: r.netProfit,
      marginPct: r.marginPct,
      unitsSold: r.unitsSold,
      orderCount: r.orderCount,
      avgPrice: r.avgPrice,
      hasCogs: r.hasCogs,
    }));
}

export function getShopifyTotals(products: ShopifyProductAggregate[]): ShopifyProductAggregate {
  const revenue = products.reduce((s, p) => s + p.revenue, 0);
  const unitsSold = products.reduce((s, p) => s + p.unitsSold, 0);
  const orderCount = products.reduce((s, p) => s + p.orderCount, 0);
  const paymentFees = products.reduce((s, p) => s + p.paymentFees, 0);
  const netProceeds = products.reduce((s, p) => s + p.netProceeds, 0);

  const cogsProducts = products.filter((p) => p.totalCogs != null);
  const totalCogs = cogsProducts.length > 0 ? cogsProducts.reduce((s, p) => s + (p.totalCogs ?? 0), 0) : null;

  const profitProducts = products.filter((p) => p.netProfit != null);
  const netProfit = profitProducts.length > 0 ? profitProducts.reduce((s, p) => s + (p.netProfit ?? 0), 0) : null;

  const marginPct = netProfit != null && revenue > 0 ? netProfit / revenue : null;

  return {
    sku: "TOTAL", productTitle: "All Products", revenue, paymentFees,
    totalCogs, netProceeds, netProfit, marginPct, unitsSold, orderCount,
    avgPrice: unitsSold > 0 ? revenue / unitsSold : 0, hasCogs: true,
  };
}

// ─── Ad data types ────────────────────────────────────────────────────────

export interface AdAsinAggregate {
  asin: string;
  sku: string;
  productTitle: string;
  spend: number;
  adSales: number;
  acos: number;
  tacos: number;
  totalRevenue: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  orders: number;
}

// ─── Expanded metrics types ──────────────────────────────────────────────

export interface AmazonExpandedMetrics {
  avgUnitsPerOrder: number | null;
  revenuePerOrder: number | null;
  refundRate: number | null;
  b2bRevenue: number | null;
  b2bPctOfTotal: number | null;
  b2cRevenue: number | null;
  b2cPctOfTotal: number | null;
  b2bUnits: number | null;
  sessions: null;
  conversionRate: null;
  activeSubscriptions: null;
}

export interface ShopifyExpandedMetrics {
  avgUnitsPerOrder: number | null;
  revenuePerOrder: number | null;
  sessions: null;
  conversionRate: null;
  avgTimeOnPage: null;
  activeSubscriptions: null;
}

// ─── Monthly aggregation types ───────────────────────────────────────────

export interface MonthlyProductData {
  label: string;
  month: string;
  revenue: number;
  adSales: number | null;
  organicSales: number | null;
  adSpend: number | null;
  totalAmazonFees: number | null;
  totalCogs: number | null;
  netProceeds: number | null;
  netProfit: number | null;
  feeSource: "settlement" | "estimated" | "mixed" | null;
}

export interface ShopifyMonthlyRow {
  label: string;
  month: string;
  revenue: number;
  paymentFees: number;
  totalCogs: number | null;
  netProfit: number | null;
}

// ─── CSV export helpers ──────────────────────────────────────────────────

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportProfitabilityCsv(
  products: ProductAggregate[],
  filename: string,
) {
  const header = "ASIN,SKU,Product,Revenue,Amazon Fees,Net Proceeds,COGS,Ad Spend,Net Profit,Margin %,Units,Avg Price,TACOS,ACOS\n";
  const rows = products.map((p) =>
    [p.asin, p.sku, `"${p.productTitle}"`, p.revenue.toFixed(2),
      p.totalAmazonFees?.toFixed(2) ?? "", p.netProceeds?.toFixed(2) ?? "",
      p.totalCogs?.toFixed(2) ?? "", p.adSpend?.toFixed(2) ?? "",
      p.netProfit?.toFixed(2) ?? "", p.marginPct ? (p.marginPct * 100).toFixed(1) + "%" : "",
      p.unitsSold, p.avgPrice.toFixed(2),
      p.tacos ? (p.tacos * 100).toFixed(1) + "%" : "",
      p.acos ? (p.acos * 100).toFixed(1) + "%" : "",
    ].join(",")
  );
  downloadCsv(header + rows.join("\n"), filename);
}

export function exportAdCsv(asins: AdAsinAggregate[], filename: string) {
  const header = "ASIN,SKU,Product,Ad Spend,Ad Sales,ACOS,TACOS,Total Revenue,Impressions,Clicks,CTR,CPC,Orders\n";
  const rows = asins.map((a) =>
    [a.asin, a.sku, `"${a.productTitle}"`, a.spend.toFixed(2), a.adSales.toFixed(2),
      (a.acos * 100).toFixed(1) + "%", (a.tacos * 100).toFixed(1) + "%",
      a.totalRevenue.toFixed(2), a.impressions, a.clicks,
      (a.ctr * 100).toFixed(2) + "%", a.cpc.toFixed(2), a.orders,
    ].join(",")
  );
  downloadCsv(header + rows.join("\n"), filename);
}

export function exportOverviewCsv(products: import("./api").UnifiedProductRow[], filename: string) {
  const header = "SKU,Product,Amazon Rev,Shopify Rev,Faire Rev,Total Rev,Net Profit,Margin %,Units,Orders,Channels\n";
  const rows = products.map((p) =>
    [p.sku, `"${p.productTitle}"`, p.amazonRev.toFixed(2), p.shopifyRev.toFixed(2),
      p.faireRev.toFixed(2), p.totalRev.toFixed(2),
      p.netProfit?.toFixed(2) ?? "", p.marginPct ? (p.marginPct * 100).toFixed(1) + "%" : "",
      p.totalUnits, p.totalOrders, p.channels.join("+"),
    ].join(",")
  );
  downloadCsv(header + rows.join("\n"), filename);
}

export function exportShopifyCsv(products: ShopifyProductAggregate[], channel: string, filename: string) {
  const header = "SKU,Product,Revenue,Payment Fees,COGS,Net Profit,Margin %,Units,Avg Price,Orders\n";
  const rows = products.map((p) =>
    [p.sku, `"${p.productTitle}"`, p.revenue.toFixed(2), p.paymentFees.toFixed(2),
      p.totalCogs?.toFixed(2) ?? "", p.netProfit?.toFixed(2) ?? "",
      p.marginPct ? (p.marginPct * 100).toFixed(1) + "%" : "",
      p.unitsSold, p.avgPrice.toFixed(2), p.orderCount,
    ].join(",")
  );
  downloadCsv(header + rows.join("\n"), filename);
}

// ─── KPI types ────────────────────────────────────────────────────────────

export interface ProfitKpiData {
  revenue: number;
  totalAmazonFees: number | null;
  netProceeds: number | null;
  netProfit: number | null;
  unitsSold: number;
  marginPct: number | null;
  revenueChange: number | null;
  feesChange: number | null;
  netProceedsChange: number | null;
  netProfitChange: number | null;
  unitsSoldChange: number | null;
  feeSource: "settlement" | "estimated" | null;
  comparisonLabel: string | null;
}

export interface OverviewKpiResult {
  totalRevenue: number;
  amazonRevenue: number;
  shopifyRevenue: number;
  faireRevenue: number;
  totalNetProfit: number | null;
  totalUnits: number;
  totalRevenueChange: number | null;
  amazonRevenueChange: number | null;
  shopifyRevenueChange: number | null;
  faireRevenueChange: number | null;
  totalNetProfitChange: number | null;
  totalUnitsChange: number | null;
  comparisonLabel: string | null;
}

export interface ChannelKpiResult {
  revenue: number;
  fees: number;
  netProceeds: number;
  netProfit: number | null;
  unitsSold: number;
  marginPct: number | null;
  cogs: number | null;
  avgOrderValue: number;
  revenueChange: number | null;
  feesChange: number | null;
  netProceedsChange: number | null;
  netProfitChange: number | null;
  unitsSoldChange: number | null;
  comparisonLabel: string | null;
}

// Compute dynamic KPIs from two API overview responses
export function computeOverviewKpis(
  current: import("./api").OverviewData,
  previous: import("./api").OverviewData | null,
  comparisonLabel: string | null,
): OverviewKpiResult {
  if (!previous) {
    return {
      ...current,
      totalRevenueChange: null, amazonRevenueChange: null,
      shopifyRevenueChange: null, faireRevenueChange: null,
      totalNetProfitChange: null, totalUnitsChange: null,
      comparisonLabel: null,
    };
  }

  return {
    ...current,
    totalRevenueChange: safePctChange(current.totalRevenue, previous.totalRevenue),
    amazonRevenueChange: safePctChange(current.amazonRevenue, previous.amazonRevenue),
    shopifyRevenueChange: safePctChange(current.shopifyRevenue, previous.shopifyRevenue),
    faireRevenueChange: safePctChange(current.faireRevenue, previous.faireRevenue),
    totalNetProfitChange: safePctChange(current.totalNetProfit, previous.totalNetProfit),
    totalUnitsChange: safePctChange(current.totalUnits, previous.totalUnits),
    comparisonLabel,
  };
}
