import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

// ─── Raw types matching the API responses ────────────────────────────────

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

export interface HeroChartRow {
  week: string;
  revenue: number;
  units: number;
  orders: number;
  totalAmazonFees: number | null;
  promotions: number | null;
  refunds: number | null;
  totalCogs: number | null;
  adSpend: number | null;
  adSales: number | null;
  organicSales: number | null;
  netProceeds: number | null;
  netProfit: number | null;
  feeSource: "settlement" | "estimated" | null;
  reimbursement?: number | null;
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

export interface DashboardData {
  generatedAt: string;
  dateRange: { oldest: string; newest: string };
  products: Product[];
  weeklyFacts: WeeklyFact[];
  heroChartData: HeroChartRow[];
  adWeeklySummary: AdWeeklySummary[];
  cogsPeriods: any[];
  meta: {
    totalAsins: number;
    totalWeeks: number;
    totalFacts: number;
    salesDataSource: string;
    adDataSource: string;
    cogsDataSource: string;
    sessionsDataSource: string;
    adDataRange: string;
    NO_ESTIMATES: boolean;
    feeDataSource?: string;
    feeRates?: any;
    settlementWeeks?: string[];
    channels?: string[];
  };
  shopifyFacts: ShopifyFact[];
  unifiedHero: UnifiedHeroRow[];
  allProducts: AllProduct[];
}

// ─── API fetch helper ────────────────────────────────────────────────────

async function fetchApi<T>(url: string): Promise<T> {
  const res = await apiRequest("GET", url);
  return res.json();
}

function buildUrl(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") search.set(k, v);
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

// ─── React Query hooks for API endpoints ─────────────────────────────────

export function useMeta() {
  return useQuery<Record<string, string>>({
    queryKey: ["/api/meta"],
  });
}

export function useProductsCatalog() {
  return useQuery<AllProduct[]>({
    queryKey: ["/api/products-catalog"],
  });
}

export function useOverview(startDate?: string, endDate?: string) {
  return useQuery<{
    totalRevenue: number;
    totalUnits: number;
    totalOrders: number;
    totalNetProfit: number | null;
    totalAmazonFees: number | null;
    totalAdSpend: number | null;
    amazonRevenue: number;
    shopifyRevenue: number;
    faireRevenue: number;
    amazonUnits: number;
    shopifyUnits: number;
    faireUnits: number;
  }>({
    queryKey: ["/api/overview", { startDate, endDate }],
    queryFn: () => fetchApi(buildUrl("/api/overview", { startDate, endDate })),
    enabled: !!startDate && !!endDate,
  });
}

export function useChannelMix(startDate?: string, endDate?: string) {
  return useQuery<ChannelMixRow[]>({
    queryKey: ["/api/channel-mix", { startDate, endDate }],
    queryFn: () => fetchApi(buildUrl("/api/channel-mix", { startDate, endDate })),
    enabled: !!startDate && !!endDate,
  });
}

export function useProducts(startDate?: string, endDate?: string, channel?: string, sortBy?: string, sortDir?: string) {
  return useQuery<ProductAggregate[]>({
    queryKey: ["/api/products", { startDate, endDate, channel, sortBy, sortDir }],
    queryFn: () => fetchApi(buildUrl("/api/products", { startDate, endDate, channel, sortBy, sortDir })),
    enabled: !!startDate && !!endDate,
  });
}

export function useShopifyProducts(channel: string, startDate?: string, endDate?: string) {
  return useQuery<ShopifyProductAggregate[]>({
    queryKey: ["/api/products", { startDate, endDate, channel }],
    queryFn: () => fetchApi(buildUrl("/api/products", { startDate, endDate, channel })),
    enabled: !!startDate && !!endDate && !!channel,
  });
}

export function useUnifiedProducts(startDate?: string, endDate?: string) {
  return useQuery<UnifiedProductRow[]>({
    queryKey: ["/api/unified-products", { startDate, endDate }],
    queryFn: () => fetchApi(buildUrl("/api/unified-products", { startDate, endDate })),
    enabled: !!startDate && !!endDate,
  });
}

export function useWeeklyChart(startDate?: string, endDate?: string, channel?: string) {
  return useQuery<UnifiedHeroRow[]>({
    queryKey: ["/api/weekly-chart", { startDate, endDate, channel }],
    queryFn: () => fetchApi(buildUrl("/api/weekly-chart", { startDate, endDate, channel })),
    enabled: !!startDate && !!endDate,
  });
}

export function useHeroChart() {
  return useQuery<HeroChartRow[]>({
    queryKey: ["/api/hero-chart"],
  });
}

export function useChannelHero(channel: string) {
  return useQuery<Array<{ week: string; rawWeek?: string; revenue: number; units: number; orders: number; netProfit: number | null; cogs: number | null }>>({
    queryKey: ["/api/channel-hero", channel],
    queryFn: () => fetchApi(`/api/channel-hero/${channel}`),
  });
}

export function useProductDetail(sku: string, startDate?: string, endDate?: string) {
  return useQuery<{
    product: any;
    weeklyMetrics: WeeklyFact[];
    adData: any[];
    cogsPeriods: any[];
  }>({
    queryKey: ["/api/product", sku, { startDate, endDate }],
    queryFn: () => fetchApi(buildUrl(`/api/product/${encodeURIComponent(sku)}`, { startDate, endDate })),
    enabled: !!sku,
  });
}

export function useAdvertising(startDate?: string, endDate?: string) {
  return useQuery<{
    totalSpend: number;
    totalAdSales: number;
    acos: number;
    totalClicks: number;
    totalImpressions: number;
    ctr: number;
    cpc: number;
    totalOrders: number;
    weeklyData: { week: string; spend: number; acos: number }[];
    asinBreakdown: AdAsinAggregate[];
    hasData: boolean;
  }>({
    queryKey: ["/api/advertising", { startDate, endDate }],
    queryFn: () => fetchApi(buildUrl("/api/advertising", { startDate, endDate })),
    enabled: !!startDate && !!endDate,
  });
}

export function usePareto(startDate?: string, endDate?: string) {
  return useQuery<ParetoProduct[]>({
    queryKey: ["/api/pareto", { startDate, endDate }],
    queryFn: () => fetchApi(buildUrl("/api/pareto", { startDate, endDate })),
    enabled: !!startDate && !!endDate,
  });
}

export function useCogsPeriods(sku?: string) {
  return useQuery<any[]>({
    queryKey: ["/api/cogs-periods", { sku }],
    queryFn: () => fetchApi(buildUrl("/api/cogs-periods", { sku })),
  });
}

export function useProductWeeklyRevenue(asin: string) {
  return useQuery<Record<string, number>>({
    queryKey: ["/api/product-weekly-revenue", asin],
    queryFn: () => fetchApi(`/api/product-weekly-revenue/${encodeURIComponent(asin)}`),
    enabled: !!asin,
  });
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
  if (productList) {
    const idx = productList.findIndex((p) => p.asin === asin);
    if (idx >= 0) return PRODUCT_COLORS[idx % PRODUCT_COLORS.length];
  }
  let hash = 0;
  for (let i = 0; i < asin.length; i++) {
    hash = ((hash << 5) - hash + asin.charCodeAt(i)) | 0;
  }
  return PRODUCT_COLORS[Math.abs(hash) % PRODUCT_COLORS.length];
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

// ─── Aggregate types ─────────────────────────────────────────────────────

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

export interface UnifiedProductRow {
  sku: string;
  asin: string | null;
  productTitle: string;
  channels: string[];
  amazonRev: number;
  shopifyRev: number;
  faireRev: number;
  totalRev: number;
  totalUnits: number;
  totalOrders: number;
  netProfit: number | null;
  marginPct: number | null;
}

export interface ChannelMixRow {
  channel: string;
  label: string;
  revenue: number;
  pctOfTotal: number;
  orders: number;
  units: number;
  netProfit: number | null;
}

export interface ParetoProduct {
  sku: string;
  productTitle: string;
  revenue: number;
  netProfit: number | null;
  hasCogs: boolean;
  channels: string[];
}

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

// ─── Dynamic KPI Period Comparison ───────────────────────────────────────

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

// ─── Totals computation (works on already-aggregated product data) ───────

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
  if (feeSources.size === 1) feeSource = feeSources.values().next().value as any;
  else if (feeSources.size > 1) feeSource = "mixed";

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

// ─── Gini coefficient (pure math, no API needed) ─────────────────────────

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

// ─── KPI interfaces ─────────────────────────────────────────────────────

function safePctChange(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export interface PeriodKpiData {
  revenue: number;
  totalAmazonFees: number | null;
  netProceeds: number | null;
  netProfit: number | null;
  unitsSold: number;
  marginPct: number | null;
}

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

export interface OverviewPeriodKpiData {
  totalRevenue: number;
  amazonRevenue: number;
  shopifyRevenue: number;
  faireRevenue: number;
  totalNetProfit: number | null;
  totalUnits: number;
}

export interface ChannelPeriodKpiData {
  revenue: number;
  fees: number;
  netProceeds: number;
  netProfit: number | null;
  unitsSold: number;
  marginPct: number | null;
  cogs: number | null;
  avgOrderValue: number;
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

export interface ChannelKpiData {
  revenue: number;
  fees: number;
  netProceeds: number;
  netProfit: number | null;
  unitsSold: number;
  marginPct: number | null;
  cogs: number | null;
  avgOrderValue: number;
  revenueChange: number;
  feesChange: number;
  netProceedsChange: number;
  netProfitChange: number | null;
  unitsSoldChange: number;
}

// ─── Dynamic KPI hooks (compute period comparison using two API calls) ───

export function useDynamicAmazonKpis(dateRange: { start: string; end: string }, preset: DatePreset) {
  const current = useOverview(dateRange.start, dateRange.end);
  const prior = getPriorPeriod(dateRange, preset);
  const prev = useOverview(prior?.start, prior?.end);

  if (!current.data) return { data: null, isLoading: current.isLoading };

  const c = current.data;
  const amazonRevenue = c.amazonRevenue ?? 0;
  const totalAmazonFees = c.totalAmazonFees;
  const netProceeds = totalAmazonFees != null ? amazonRevenue - Math.abs(totalAmazonFees) : null;
  const amazonNetProfit = c.totalNetProfit; // approximate
  const amazonUnits = c.amazonUnits ?? 0;
  const marginPct = amazonNetProfit != null && amazonRevenue > 0 ? amazonNetProfit / amazonRevenue : null;

  const result: ProfitKpiData = {
    revenue: amazonRevenue,
    totalAmazonFees,
    netProceeds,
    netProfit: amazonNetProfit,
    unitsSold: amazonUnits,
    marginPct,
    revenueChange: null,
    feesChange: null,
    netProceedsChange: null,
    netProfitChange: null,
    unitsSoldChange: null,
    feeSource: null,
    comparisonLabel: prior?.label ?? null,
  };

  if (prev.data && prior) {
    const p = prev.data;
    result.revenueChange = safePctChange(amazonRevenue, p.amazonRevenue);
    result.feesChange = safePctChange(totalAmazonFees, p.totalAmazonFees);
    result.unitsSoldChange = safePctChange(amazonUnits, p.amazonUnits);
    result.netProfitChange = safePctChange(amazonNetProfit, p.totalNetProfit);
  }

  return { data: result, isLoading: current.isLoading || prev.isLoading };
}

export function useDynamicOverviewKpis(dateRange: { start: string; end: string }, preset: DatePreset) {
  const current = useOverview(dateRange.start, dateRange.end);
  const prior = getPriorPeriod(dateRange, preset);
  const prev = useOverview(prior?.start, prior?.end);

  if (!current.data) return { data: null, isLoading: current.isLoading };

  const c = current.data;
  const result: OverviewKpiResult = {
    totalRevenue: c.totalRevenue,
    amazonRevenue: c.amazonRevenue,
    shopifyRevenue: c.shopifyRevenue,
    faireRevenue: c.faireRevenue,
    totalNetProfit: c.totalNetProfit,
    totalUnits: c.totalUnits,
    totalRevenueChange: null,
    amazonRevenueChange: null,
    shopifyRevenueChange: null,
    faireRevenueChange: null,
    totalNetProfitChange: null,
    totalUnitsChange: null,
    comparisonLabel: prior?.label ?? null,
  };

  if (prev.data && prior) {
    const p = prev.data;
    result.totalRevenueChange = safePctChange(c.totalRevenue, p.totalRevenue);
    result.amazonRevenueChange = safePctChange(c.amazonRevenue, p.amazonRevenue);
    result.shopifyRevenueChange = safePctChange(c.shopifyRevenue, p.shopifyRevenue);
    result.faireRevenueChange = safePctChange(c.faireRevenue, p.faireRevenue);
    result.totalNetProfitChange = safePctChange(c.totalNetProfit, p.totalNetProfit);
    result.totalUnitsChange = safePctChange(c.totalUnits, p.totalUnits);
  }

  return { data: result, isLoading: current.isLoading || prev.isLoading };
}

export function useDynamicChannelKpis(channel: "shopify_dtc" | "faire", dateRange: { start: string; end: string }, preset: DatePreset) {
  // Use products endpoint with channel filter for Shopify/Faire KPIs
  const currentProducts = useShopifyProducts(channel, dateRange.start, dateRange.end);
  const prior = getPriorPeriod(dateRange, preset);
  const prevProducts = useShopifyProducts(channel, prior?.start, prior?.end);

  if (!currentProducts.data) return { data: null, isLoading: currentProducts.isLoading };

  const prods = currentProducts.data;
  const revenue = prods.reduce((s, p) => s + p.revenue, 0);
  const unitsSold = prods.reduce((s, p) => s + p.unitsSold, 0);
  const orderCount = prods.reduce((s, p) => s + p.orderCount, 0);
  const fees = prods.reduce((s, p) => s + p.paymentFees, 0);
  const netProceeds = revenue - fees;
  const cogsP = prods.filter((p) => p.totalCogs != null);
  const cogs = cogsP.length > 0 ? cogsP.reduce((s, p) => s + (p.totalCogs ?? 0), 0) : null;
  const profitP = prods.filter((p) => p.netProfit != null);
  const netProfit = profitP.length > 0 ? profitP.reduce((s, p) => s + (p.netProfit ?? 0), 0) : null;
  const marginPct = netProfit != null && revenue > 0 ? netProfit / revenue : null;

  const result: ChannelKpiResult = {
    revenue, fees, netProceeds, netProfit, unitsSold, marginPct, cogs,
    avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
    revenueChange: null, feesChange: null, netProceedsChange: null,
    netProfitChange: null, unitsSoldChange: null,
    comparisonLabel: prior?.label ?? null,
  };

  if (prevProducts.data && prior) {
    const pp = prevProducts.data;
    const prevRev = pp.reduce((s, p) => s + p.revenue, 0);
    const prevUnits = pp.reduce((s, p) => s + p.unitsSold, 0);
    const prevFees = pp.reduce((s, p) => s + p.paymentFees, 0);
    const prevNP = pp.filter((p) => p.netProfit != null).reduce((s, p) => s + (p.netProfit ?? 0), 0);
    result.revenueChange = safePctChange(revenue, prevRev);
    result.feesChange = safePctChange(fees, prevFees);
    result.netProceedsChange = safePctChange(netProceeds, prevRev - prevFees);
    result.netProfitChange = safePctChange(netProfit, prevNP);
    result.unitsSoldChange = safePctChange(unitsSold, prevUnits);
  }

  return { data: result, isLoading: currentProducts.isLoading || prevProducts.isLoading };
}

// ─── Helper to compute monthly from weekly data ──────────────────────────

export function computeMonthlyFromWeekly(weeks: WeeklyFact[]): MonthlyProductData[] {
  const byMonth = new Map<string, { facts: WeeklyFact[]; label: string }>();
  for (const w of weeks) {
    const d = new Date(w.weekStartDate + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (!byMonth.has(key)) byMonth.set(key, { facts: [], label });
    byMonth.get(key)!.facts.push(w);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { facts, label }]) => {
      const revenue = facts.reduce((s, w) => s + w.revenue, 0);
      const adSalesWeeks = facts.filter((w) => w.adSales != null);
      const adSales = adSalesWeeks.length > 0 ? adSalesWeeks.reduce((s, w) => s + (w.adSales ?? 0), 0) : null;
      const organicWeeks = facts.filter((w) => w.organicSales != null);
      const organicSales = organicWeeks.length > 0 ? organicWeeks.reduce((s, w) => s + (w.organicSales ?? 0), 0) : null;
      const adSpendWeeks = facts.filter((w) => w.adSpend != null);
      const adSpend = adSpendWeeks.length > 0 ? adSpendWeeks.reduce((s, w) => s + (w.adSpend ?? 0), 0) : null;
      const feeWeeks = facts.filter((w) => w.totalAmazonFees != null);
      const totalAmazonFees = feeWeeks.length > 0 ? feeWeeks.reduce((s, w) => s + (w.totalAmazonFees ?? 0), 0) : null;
      const cogsWeeks = facts.filter((w) => w.totalCogs != null);
      const totalCogs = cogsWeeks.length > 0 ? cogsWeeks.reduce((s, w) => s + (w.totalCogs ?? 0), 0) : null;
      const npWeeks = facts.filter((w) => w.netProceeds != null);
      const netProceeds = npWeeks.length > 0 ? npWeeks.reduce((s, w) => s + (w.netProceeds ?? 0), 0) : null;
      const profitWeeks = facts.filter((w) => w.netProfit != null);
      const netProfit = profitWeeks.length > 0 ? profitWeeks.reduce((s, w) => s + (w.netProfit ?? 0), 0) : null;
      const feeSources = new Set(facts.map((w) => w.feeSource).filter(Boolean));
      let feeSource: "settlement" | "estimated" | "mixed" | null = null;
      if (feeSources.size === 1) feeSource = feeSources.values().next().value as any;
      else if (feeSources.size > 1) feeSource = "mixed";
      return { label, month, revenue, adSales, organicSales, adSpend, totalAmazonFees, totalCogs, netProceeds, netProfit, feeSource };
    });
}

export function computeShopifyMonthly(weeks: ShopifyFact[]): ShopifyMonthlyRow[] {
  const byMonth = new Map<string, { facts: ShopifyFact[]; label: string }>();
  for (const w of weeks) {
    const d = new Date(w.weekStartDate + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (!byMonth.has(key)) byMonth.set(key, { facts: [], label });
    byMonth.get(key)!.facts.push(w);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { facts, label }]) => {
      const revenue = facts.reduce((s, w) => s + w.revenue, 0);
      const paymentFees = facts.reduce((s, w) => s + w.paymentFees, 0);
      const cogsWeeks = facts.filter((w) => w.totalCogs != null);
      const totalCogs = cogsWeeks.length > 0 ? cogsWeeks.reduce((s, w) => s + (w.totalCogs ?? 0), 0) : null;
      const profitWeeks = facts.filter((w) => w.netProfit != null);
      const netProfit = profitWeeks.length > 0 ? profitWeeks.reduce((s, w) => s + (w.netProfit ?? 0), 0) : null;
      return { label, month, revenue, paymentFees, totalCogs, netProfit };
    });
}

// ─── CSV export (client-side, works on already-fetched data) ─────────────

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportProfitabilityCsv(products: ProductAggregate[], filename: string) {
  const headers = [
    "Product", "SKU", "ASIN", "Revenue", "Amazon Fees", "Net Proceeds",
    "COGS", "Ad Spend", "Net Profit", "Margin %", "Units Sold",
  ];
  const rows = products.map((p) => [
    `"${p.productTitle.replace(/"/g, '""')}"`,
    p.sku, p.asin, p.revenue.toFixed(2),
    p.totalAmazonFees != null ? p.totalAmazonFees.toFixed(2) : "",
    p.netProceeds != null ? p.netProceeds.toFixed(2) : "",
    p.totalCogs != null ? p.totalCogs.toFixed(2) : "",
    p.adSpend != null ? p.adSpend.toFixed(2) : "",
    p.netProfit != null ? p.netProfit.toFixed(2) : "",
    p.marginPct != null ? (p.marginPct * 100).toFixed(1) : "",
    p.unitsSold,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, filename);
}

export function exportAdCsv(asins: AdAsinAggregate[], filename: string) {
  const headers = [
    "Product", "SKU", "ASIN", "Ad Spend", "Ad Sales", "ACOS", "TACOS",
    "Impressions", "Clicks", "CTR", "CPC", "Ad Orders",
  ];
  const rows = asins.map((a) => [
    `"${a.productTitle.replace(/"/g, '""')}"`,
    a.sku, a.asin, a.spend.toFixed(2), a.adSales.toFixed(2),
    (a.acos * 100).toFixed(1) + "%", (a.tacos * 100).toFixed(1) + "%",
    a.impressions, a.clicks, (a.ctr * 100).toFixed(2) + "%",
    a.cpc.toFixed(2), a.orders,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, filename);
}

export function exportOverviewCsv(products: UnifiedProductRow[], filename: string) {
  const headers = [
    "Product", "SKU", "ASIN", "Amazon Rev", "Shopify Rev", "Faire Rev",
    "Total Rev", "Total Units", "Channels",
  ];
  const rows = products.map((p) => [
    `"${p.productTitle.replace(/"/g, '""')}"`,
    p.sku, p.asin ?? "",
    p.amazonRev.toFixed(2), p.shopifyRev.toFixed(2), p.faireRev.toFixed(2),
    p.totalRev.toFixed(2), p.totalUnits,
    p.channels.join("|"),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, filename);
}

export function exportShopifyCsv(products: ShopifyProductAggregate[], channel: string, filename: string) {
  const headers = [
    "Product", "SKU", "Revenue", "Payment Fees", "COGS", "Net Proceeds",
    "Net Profit", "Margin %", "Units Sold", "Orders", "Avg Price",
  ];
  const rows = products.map((p) => [
    `"${p.productTitle.replace(/"/g, '""')}"`,
    p.sku, p.revenue.toFixed(2), p.paymentFees.toFixed(2),
    p.totalCogs != null ? p.totalCogs.toFixed(2) : "",
    p.netProceeds.toFixed(2),
    p.netProfit != null ? p.netProfit.toFixed(2) : "",
    p.marginPct != null ? (p.marginPct * 100).toFixed(1) : "",
    p.unitsSold, p.orderCount, p.avgPrice.toFixed(2),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, filename);
}

// ─── Compat: getAmazonExpandedMetrics from product aggregate ─────────────

export function getAmazonExpandedMetrics(
  productOrAsin: string | ProductAggregate,
  _startDate?: string,
  _endDate?: string,
): AmazonExpandedMetrics {
  if (typeof productOrAsin !== "string") {
    const p = productOrAsin;
    return {
      avgUnitsPerOrder: p.avgUnitsPerOrder,
      revenuePerOrder: p.revenuePerOrder,
      refundRate: p.refundRate,
      b2bRevenue: p.b2bRevenue,
      b2bPctOfTotal: p.b2bRevenue != null && p.revenue > 0 ? p.b2bRevenue / p.revenue : null,
      b2cRevenue: p.b2cRevenue,
      b2cPctOfTotal: p.b2cRevenue != null && p.revenue > 0 ? p.b2cRevenue / p.revenue : null,
      b2bUnits: p.b2bUnits,
      sessions: null, conversionRate: null, activeSubscriptions: null,
    };
  }
  return {
    avgUnitsPerOrder: null, revenuePerOrder: null, refundRate: null,
    b2bRevenue: null, b2bPctOfTotal: null, b2cRevenue: null, b2cPctOfTotal: null,
    b2bUnits: null, sessions: null, conversionRate: null, activeSubscriptions: null,
  };
}

export function getShopifyExpandedMetrics(
  _channel: "shopify_dtc" | "faire",
  product: ShopifyProductAggregate | string,
  _startDate?: string,
  _endDate?: string,
): ShopifyExpandedMetrics {
  if (typeof product !== "string") {
    const p = product;
    return {
      avgUnitsPerOrder: p.orderCount > 0 ? p.unitsSold / p.orderCount : null,
      revenuePerOrder: p.orderCount > 0 ? p.revenue / p.orderCount : null,
      sessions: null, conversionRate: null, avgTimeOnPage: null, activeSubscriptions: null,
    };
  }
  return {
    avgUnitsPerOrder: null, revenuePerOrder: null,
    sessions: null, conversionRate: null, avgTimeOnPage: null, activeSubscriptions: null,
  };
}
