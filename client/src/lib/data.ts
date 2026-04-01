import dashboardData from "../data/dashboard-data.json";

// ─── Raw types matching the JSON bundle ───────────────────────────────────

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
  // New V4 fields
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
  // New V4 fields
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

export const data: DashboardData = dashboardData as unknown as DashboardData;

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

// Assign color deterministically by ASIN index in data.products
const asinColorMap = new Map<string, string>();
data.products.forEach((p, i) => {
  asinColorMap.set(p.asin, PRODUCT_COLORS[i % PRODUCT_COLORS.length]);
});

export function getProductColor(asin: string): string {
  return asinColorMap.get(asin) ?? PRODUCT_COLORS[0];
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

// ─── Amazon Profitability aggregation ──────────────────────────────────

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
  // V4 expanded row fields (aggregated)
  avgUnitsPerOrder: number | null;
  revenuePerOrder: number | null;
  refundRate: number | null;
  b2bRevenue: number | null;
  b2cRevenue: number | null;
  b2bUnits: number | null;
}

export function aggregateProducts(
  facts: WeeklyFact[],
  startDate?: string,
  endDate?: string
): ProductAggregate[] {
  const filtered = facts.filter((f) => {
    if (f.channel !== "amazon") return false;
    if (startDate && f.weekStartDate < startDate) return false;
    if (endDate && f.weekEndDate > endDate) return false;
    return true;
  });

  const byProduct = new Map<string, WeeklyFact[]>();
  for (const f of filtered) {
    if (!byProduct.has(f.asin)) byProduct.set(f.asin, []);
    byProduct.get(f.asin)!.push(f);
  }

  const results: ProductAggregate[] = [];
  for (const [asin, weeks] of byProduct) {
    const first = weeks[0];
    const revenue = weeks.reduce((s, w) => s + w.revenue, 0);
    const unitsSold = weeks.reduce((s, w) => s + w.unitsSold, 0);
    const orderCount = weeks.reduce((s, w) => s + w.orderCount, 0);
    const hasCogs = weeks.some((w) => w.hasCogs);

    const cogsWeeks = weeks.filter((w) => w.totalCogs != null);
    const totalCogs = cogsWeeks.length > 0 ? cogsWeeks.reduce((s, w) => s + (w.totalCogs ?? 0), 0) : null;

    const feeWeeks = weeks.filter((w) => w.totalAmazonFees != null);
    const totalAmazonFees = feeWeeks.length > 0 ? feeWeeks.reduce((s, w) => s + (w.totalAmazonFees ?? 0), 0) : null;

    const npWeeks = weeks.filter((w) => w.netProceeds != null);
    const netProceeds = npWeeks.length > 0 ? npWeeks.reduce((s, w) => s + (w.netProceeds ?? 0), 0) : null;

    const adWeeks = weeks.filter((w) => w.adSpend != null);
    const adSpend = adWeeks.length > 0 ? adWeeks.reduce((s, w) => s + (w.adSpend ?? 0), 0) : null;

    const adSalesWeeks = weeks.filter((w) => w.adSales != null);
    const adSales = adSalesWeeks.length > 0 ? adSalesWeeks.reduce((s, w) => s + (w.adSales ?? 0), 0) : null;

    const profitWeeks = weeks.filter((w) => w.netProfit != null);
    const netProfit = profitWeeks.length > 0 ? profitWeeks.reduce((s, w) => s + (w.netProfit ?? 0), 0) : null;

    const marginPct = netProfit != null && revenue > 0 ? netProfit / revenue : null;

    const feeSources = new Set(weeks.map((w) => w.feeSource).filter(Boolean));
    let feeSource: "settlement" | "estimated" | "mixed" | null = null;
    if (feeSources.size === 1) {
      feeSource = feeSources.values().next().value as any;
    } else if (feeSources.size > 1) {
      feeSource = "mixed";
    }

    const avgPrice = unitsSold > 0 ? revenue / unitsSold : 0;

    const refundWeeks = weeks.filter((w) => w.refundAmount != null);
    const refundAmount = refundWeeks.length > 0 ? refundWeeks.reduce((s, w) => s + (w.refundAmount ?? 0), 0) : null;

    const tacos = adSpend != null && revenue > 0 ? adSpend / revenue : null;
    const acos = adSpend != null && adSales != null && adSales > 0 ? adSpend / adSales : null;

    // V4 expanded metrics
    const avgUnitsPerOrder = orderCount > 0 ? unitsSold / orderCount : null;
    const revenuePerOrder = orderCount > 0 ? revenue / orderCount : null;

    const refundRateWeeks = weeks.filter((w) => w.refundRate != null);
    const refundRate = refundRateWeeks.length > 0
      ? refundRateWeeks.reduce((s, w) => s + (w.refundRate ?? 0), 0) / refundRateWeeks.length
      : null;

    const b2bWeeks = weeks.filter((w) => w.b2bRevenue != null);
    const b2bRevenue = b2bWeeks.length > 0 ? b2bWeeks.reduce((s, w) => s + (w.b2bRevenue ?? 0), 0) : null;
    const b2cWeeks = weeks.filter((w) => w.b2cRevenue != null);
    const b2cRevenue = b2cWeeks.length > 0 ? b2cWeeks.reduce((s, w) => s + (w.b2cRevenue ?? 0), 0) : null;
    const b2bUnitWeeks = weeks.filter((w) => w.b2bUnits != null);
    const b2bUnits = b2bUnitWeeks.length > 0 ? b2bUnitWeeks.reduce((s, w) => s + (w.b2bUnits ?? 0), 0) : null;

    results.push({
      asin, sku: first.sku, productTitle: first.productTitle,
      hasCogs, revenue, totalCogs, totalAmazonFees, netProceeds, adSpend, adSales,
      netProfit, marginPct, unitsSold, avgPrice, feeSource, orderCount, refundAmount,
      tacos, acos, avgUnitsPerOrder, revenuePerOrder, refundRate,
      b2bRevenue, b2cRevenue, b2bUnits,
    });
  }

  return results;
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

// ─── Dynamic KPI Period Comparison (Feature 2) ──────────────────────────

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
    // Compare vs same period last year
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

  // For all other presets and custom: prior same-length period
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

// Aggregate Amazon KPIs for any date range
export interface PeriodKpiData {
  revenue: number;
  totalAmazonFees: number | null;
  netProceeds: number | null;
  netProfit: number | null;
  unitsSold: number;
  marginPct: number | null;
}

export function getAmazonKpisForRange(startDate: string, endDate: string): PeriodKpiData {
  const facts = data.weeklyFacts.filter((f) => {
    if (f.channel !== "amazon") return false;
    if (f.weekStartDate < startDate) return false;
    if (f.weekEndDate > endDate) return false;
    return true;
  });

  const revenue = facts.reduce((s, f) => s + f.revenue, 0);
  const unitsSold = facts.reduce((s, f) => s + f.unitsSold, 0);
  const feeW = facts.filter((f) => f.totalAmazonFees != null);
  const totalAmazonFees = feeW.length > 0 ? feeW.reduce((s, f) => s + (f.totalAmazonFees ?? 0), 0) : null;
  const npW = facts.filter((f) => f.netProceeds != null);
  const netProceeds = npW.length > 0 ? npW.reduce((s, f) => s + (f.netProceeds ?? 0), 0) : null;
  const profitW = facts.filter((f) => f.netProfit != null);
  const netProfit = profitW.length > 0 ? profitW.reduce((s, f) => s + (f.netProfit ?? 0), 0) : null;
  const marginPct = netProfit != null && revenue > 0 ? netProfit / revenue : null;

  return { revenue, totalAmazonFees, netProceeds, netProfit, unitsSold, marginPct };
}

// Aggregate Overview KPIs for any date range
export interface OverviewPeriodKpiData {
  totalRevenue: number;
  amazonRevenue: number;
  shopifyRevenue: number;
  faireRevenue: number;
  totalNetProfit: number | null;
  totalUnits: number;
}

export function getOverviewKpisForRange(startDate: string, endDate: string): OverviewPeriodKpiData {
  const filtered = data.unifiedHero.filter((r) => {
    if (r.week < startDate) return false;
    if (r.week > endDate) return false;
    return true;
  });

  const amazonRevenue = filtered.reduce((s, r) => s + r.amazonRevenue, 0);
  const shopifyRevenue = filtered.reduce((s, r) => s + r.shopifyRevenue, 0);
  const faireRevenue = filtered.reduce((s, r) => s + r.faireRevenue, 0);
  const totalRevenue = amazonRevenue + shopifyRevenue + faireRevenue;
  const totalUnits = filtered.reduce((s, r) => s + r.totalUnits, 0);
  const profitRows = filtered.filter((r) => r.totalNetProfit != null);
  const totalNetProfit = profitRows.length > 0 ? profitRows.reduce((s, r) => s + (r.totalNetProfit ?? 0), 0) : null;

  return { totalRevenue, amazonRevenue, shopifyRevenue, faireRevenue, totalNetProfit, totalUnits };
}

// Channel KPIs for any range
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

export function getChannelKpisForRange(channel: "shopify_dtc" | "faire", startDate: string, endDate: string): ChannelPeriodKpiData {
  const facts = data.shopifyFacts.filter((f) => {
    if (f.channel !== channel) return false;
    if (f.weekStartDate < startDate) return false;
    if (f.weekStartDate > endDate) return false;
    return true;
  });

  const revenue = facts.reduce((s, f) => s + f.revenue, 0);
  const unitsSold = facts.reduce((s, f) => s + f.unitsSold, 0);
  const orderCount = facts.reduce((s, f) => s + f.orderCount, 0);
  const fees = facts.reduce((s, f) => s + f.paymentFees, 0);
  const netProceeds = revenue - fees;
  const cogsW = facts.filter((f) => f.totalCogs != null);
  const cogs = cogsW.length > 0 ? cogsW.reduce((s, f) => s + (f.totalCogs ?? 0), 0) : null;
  const profitW = facts.filter((f) => f.netProfit != null);
  const netProfit = profitW.length > 0 ? profitW.reduce((s, f) => s + (f.netProfit ?? 0), 0) : null;
  const marginPct = netProfit != null && revenue > 0 ? netProfit / revenue : null;
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

  return { revenue, fees, netProceeds, netProfit, unitsSold, marginPct, cogs, avgOrderValue };
}

function safePctChange(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

// ─── WoW KPIs for Amazon (Profitability) ──────────────────────────────────

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

export function getDynamicAmazonKpis(
  dateRange: { start: string; end: string },
  preset: DatePreset,
): ProfitKpiData {
  const current = getAmazonKpisForRange(dateRange.start, dateRange.end);
  const prior = getPriorPeriod(dateRange, preset);

  if (!prior) {
    return {
      ...current,
      revenueChange: null, feesChange: null, netProceedsChange: null,
      netProfitChange: null, unitsSoldChange: null,
      feeSource: null, comparisonLabel: null,
    };
  }

  const prev = getAmazonKpisForRange(prior.start, prior.end);

  return {
    ...current,
    revenueChange: safePctChange(current.revenue, prev.revenue),
    feesChange: safePctChange(current.totalAmazonFees, prev.totalAmazonFees),
    netProceedsChange: safePctChange(current.netProceeds, prev.netProceeds),
    netProfitChange: safePctChange(current.netProfit, prev.netProfit),
    unitsSoldChange: safePctChange(current.unitsSold, prev.unitsSold),
    feeSource: null,
    comparisonLabel: prior.label,
  };
}

// Dynamic Overview KPIs
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

export function getDynamicOverviewKpis(
  dateRange: { start: string; end: string },
  preset: DatePreset,
): OverviewKpiResult {
  const current = getOverviewKpisForRange(dateRange.start, dateRange.end);
  const prior = getPriorPeriod(dateRange, preset);

  if (!prior) {
    return {
      ...current,
      totalRevenueChange: null, amazonRevenueChange: null,
      shopifyRevenueChange: null, faireRevenueChange: null,
      totalNetProfitChange: null, totalUnitsChange: null,
      comparisonLabel: null,
    };
  }

  const prev = getOverviewKpisForRange(prior.start, prior.end);

  return {
    ...current,
    totalRevenueChange: safePctChange(current.totalRevenue, prev.totalRevenue),
    amazonRevenueChange: safePctChange(current.amazonRevenue, prev.amazonRevenue),
    shopifyRevenueChange: safePctChange(current.shopifyRevenue, prev.shopifyRevenue),
    faireRevenueChange: safePctChange(current.faireRevenue, prev.faireRevenue),
    totalNetProfitChange: safePctChange(current.totalNetProfit, prev.totalNetProfit),
    totalUnitsChange: safePctChange(current.totalUnits, prev.totalUnits),
    comparisonLabel: prior.label,
  };
}

// Dynamic Channel KPIs
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

export function getDynamicChannelKpis(
  channel: "shopify_dtc" | "faire",
  dateRange: { start: string; end: string },
  preset: DatePreset,
): ChannelKpiResult {
  const current = getChannelKpisForRange(channel, dateRange.start, dateRange.end);
  const prior = getPriorPeriod(dateRange, preset);

  if (!prior) {
    return {
      ...current,
      revenueChange: null, feesChange: null, netProceedsChange: null,
      netProfitChange: null, unitsSoldChange: null,
      comparisonLabel: null,
    };
  }

  const prev = getChannelKpisForRange(channel, prior.start, prior.end);

  return {
    ...current,
    revenueChange: safePctChange(current.revenue, prev.revenue),
    feesChange: safePctChange(current.fees, prev.fees),
    netProceedsChange: safePctChange(current.netProceeds, prev.netProceeds),
    netProfitChange: safePctChange(current.netProfit, prev.netProfit),
    unitsSoldChange: safePctChange(current.unitsSold, prev.unitsSold),
    comparisonLabel: prior.label,
  };
}

// ─── Expanded row metrics (Feature 4) ────────────────────────────────────

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

export function getAmazonExpandedMetrics(
  asin: string,
  startDate: string,
  endDate: string
): AmazonExpandedMetrics {
  const facts = data.weeklyFacts.filter((f) => {
    if (f.channel !== "amazon" || f.asin !== asin) return false;
    if (f.weekStartDate < startDate) return false;
    if (f.weekEndDate > endDate) return false;
    return true;
  });

  const totalRev = facts.reduce((s, f) => s + f.revenue, 0);
  const totalUnits = facts.reduce((s, f) => s + f.unitsSold, 0);
  const totalOrders = facts.reduce((s, f) => s + f.orderCount, 0);

  const avgUnitsPerOrder = totalOrders > 0 ? totalUnits / totalOrders : null;
  const revenuePerOrder = totalOrders > 0 ? totalRev / totalOrders : null;

  const refundRateWeeks = facts.filter((f) => f.refundRate != null);
  const refundRate = refundRateWeeks.length > 0
    ? refundRateWeeks.reduce((s, f) => s + (f.refundRate ?? 0), 0) / refundRateWeeks.length
    : null;

  const b2bW = facts.filter((f) => f.b2bRevenue != null);
  const b2bRevenue = b2bW.length > 0 ? b2bW.reduce((s, f) => s + (f.b2bRevenue ?? 0), 0) : null;
  const b2cW = facts.filter((f) => f.b2cRevenue != null);
  const b2cRevenue = b2cW.length > 0 ? b2cW.reduce((s, f) => s + (f.b2cRevenue ?? 0), 0) : null;
  const b2bUW = facts.filter((f) => f.b2bUnits != null);
  const b2bUnits = b2bUW.length > 0 ? b2bUW.reduce((s, f) => s + (f.b2bUnits ?? 0), 0) : null;

  const b2bPctOfTotal = b2bRevenue != null && totalRev > 0 ? b2bRevenue / totalRev : null;
  const b2cPctOfTotal = b2cRevenue != null && totalRev > 0 ? b2cRevenue / totalRev : null;

  return {
    avgUnitsPerOrder, revenuePerOrder, refundRate,
    b2bRevenue, b2bPctOfTotal, b2cRevenue, b2cPctOfTotal, b2bUnits,
    sessions: null, conversionRate: null, activeSubscriptions: null,
  };
}

export interface ShopifyExpandedMetrics {
  avgUnitsPerOrder: number | null;
  revenuePerOrder: number | null;
  sessions: null;
  conversionRate: null;
  avgTimeOnPage: null;
  activeSubscriptions: null;
}

export function getShopifyExpandedMetrics(
  channel: "shopify_dtc" | "faire",
  sku: string,
  startDate: string,
  endDate: string
): ShopifyExpandedMetrics {
  const facts = data.shopifyFacts.filter((f) => {
    if (f.channel !== channel || f.sku !== sku) return false;
    if (f.weekStartDate < startDate) return false;
    if (f.weekStartDate > endDate) return false;
    return true;
  });

  const totalRev = facts.reduce((s, f) => s + f.revenue, 0);
  const totalOrders = facts.reduce((s, f) => s + f.orderCount, 0);
  const totalUnits = facts.reduce((s, f) => s + f.unitsSold, 0);

  return {
    avgUnitsPerOrder: totalOrders > 0 ? totalUnits / totalOrders : null,
    revenuePerOrder: totalOrders > 0 ? totalRev / totalOrders : null,
    sessions: null, conversionRate: null, avgTimeOnPage: null, activeSubscriptions: null,
  };
}

// ─── Pareto analysis (Feature 5) ─────────────────────────────────────────

export interface ParetoProduct {
  sku: string;
  productTitle: string;
  revenue: number;
  netProfit: number | null;
  hasCogs: boolean;
  channels: string[];
}

export function getParetoData(startDate: string, endDate: string): ParetoProduct[] {
  // Combine Amazon + Shopify + Faire data per SKU
  const skuMap = new Map<string, ParetoProduct>();

  // Amazon
  for (const f of data.weeklyFacts) {
    if (f.channel !== "amazon") continue;
    if (f.weekStartDate < startDate || f.weekEndDate > endDate) continue;
    const existing = skuMap.get(f.sku);
    if (existing) {
      existing.revenue += f.revenue;
      if (f.netProfit != null) existing.netProfit = (existing.netProfit ?? 0) + f.netProfit;
      if (!existing.channels.includes("amazon")) existing.channels.push("amazon");
    } else {
      skuMap.set(f.sku, {
        sku: f.sku, productTitle: f.productTitle, revenue: f.revenue,
        netProfit: f.netProfit, hasCogs: f.hasCogs, channels: ["amazon"],
      });
    }
  }

  // Shopify/Faire
  for (const f of data.shopifyFacts) {
    if (f.weekStartDate < startDate || f.weekStartDate > endDate) continue;
    const existing = skuMap.get(f.sku);
    if (existing) {
      existing.revenue += f.revenue;
      if (f.netProfit != null) existing.netProfit = (existing.netProfit ?? 0) + f.netProfit;
      if (f.hasCogs) existing.hasCogs = true;
      if (!existing.channels.includes(f.channel)) existing.channels.push(f.channel);
    } else {
      skuMap.set(f.sku, {
        sku: f.sku, productTitle: f.productTitle, revenue: f.revenue,
        netProfit: f.netProfit, hasCogs: f.hasCogs, channels: [f.channel],
      });
    }
  }

  return Array.from(skuMap.values());
}

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

// ─── Channel Mix data ────────────────────────────────────────────────────

export interface ChannelMixRow {
  channel: string;
  label: string;
  revenue: number;
  pctOfTotal: number;
  orders: number;
  units: number;
  netProfit: number | null;
}

export function getChannelMix(startDate?: string, endDate?: string): ChannelMixRow[] {
  const filtered = data.unifiedHero.filter((r) => {
    if (startDate && r.week < startDate) return false;
    if (endDate && r.week > endDate) return false;
    return true;
  });

  const sums = filtered.reduce(
    (acc, r) => ({
      amazonRevenue: acc.amazonRevenue + r.amazonRevenue,
      shopifyRevenue: acc.shopifyRevenue + r.shopifyRevenue,
      faireRevenue: acc.faireRevenue + r.faireRevenue,
      totalRevenue: acc.totalRevenue + r.totalRevenue,
      amazonOrders: acc.amazonOrders + r.amazonOrders,
      shopifyOrders: acc.shopifyOrders + r.shopifyOrders,
      faireOrders: acc.faireOrders + r.faireOrders,
      amazonUnits: acc.amazonUnits + r.amazonUnits,
      shopifyUnits: acc.shopifyUnits + r.shopifyUnits,
      faireUnits: acc.faireUnits + r.faireUnits,
      amazonNetProfit: acc.amazonNetProfit + (r.amazonNetProfit ?? 0),
      shopifyNetProfit: acc.shopifyNetProfit + (r.shopifyNetProfit ?? 0),
      faireNetProfit: acc.faireNetProfit + (r.faireNetProfit ?? 0),
    }),
    {
      amazonRevenue: 0, shopifyRevenue: 0, faireRevenue: 0, totalRevenue: 0,
      amazonOrders: 0, shopifyOrders: 0, faireOrders: 0,
      amazonUnits: 0, shopifyUnits: 0, faireUnits: 0,
      amazonNetProfit: 0, shopifyNetProfit: 0, faireNetProfit: 0,
    }
  );

  const total = sums.totalRevenue || 1;

  return [
    { channel: "amazon", label: "Amazon", revenue: sums.amazonRevenue, pctOfTotal: sums.amazonRevenue / total, orders: sums.amazonOrders, units: sums.amazonUnits, netProfit: sums.amazonNetProfit },
    { channel: "shopify_dtc", label: "Shopify DTC", revenue: sums.shopifyRevenue, pctOfTotal: sums.shopifyRevenue / total, orders: sums.shopifyOrders, units: sums.shopifyUnits, netProfit: sums.shopifyNetProfit },
    { channel: "faire", label: "Faire/Wholesale", revenue: sums.faireRevenue, pctOfTotal: sums.faireRevenue / total, orders: sums.faireOrders, units: sums.faireUnits, netProfit: sums.faireNetProfit },
  ];
}

// ─── Unified product table ───────────────────────────────────────────────

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

export function getUnifiedProducts(startDate?: string, endDate?: string): UnifiedProductRow[] {
  // Aggregate Amazon revenue per SKU
  const amazonBySku = new Map<string, { rev: number; units: number; orders: number; netProfit: number | null }>();
  for (const f of data.weeklyFacts) {
    if (f.channel !== "amazon") continue;
    if (startDate && f.weekStartDate < startDate) continue;
    if (endDate && f.weekEndDate > endDate) continue;
    const prev = amazonBySku.get(f.sku) ?? { rev: 0, units: 0, orders: 0, netProfit: null };
    prev.rev += f.revenue;
    prev.units += f.unitsSold;
    prev.orders += f.orderCount;
    if (f.netProfit != null) prev.netProfit = (prev.netProfit ?? 0) + f.netProfit;
    amazonBySku.set(f.sku, prev);
  }

  // Aggregate Shopify DTC & Faire revenue per SKU
  const shopifyBySku = new Map<string, { rev: number; units: number; orders: number; netProfit: number | null }>();
  const faireBySku = new Map<string, { rev: number; units: number; orders: number; netProfit: number | null }>();
  for (const f of data.shopifyFacts) {
    if (startDate && f.weekStartDate < startDate) continue;
    if (endDate && f.weekStartDate > endDate) continue;
    const map = f.channel === "shopify_dtc" ? shopifyBySku : faireBySku;
    const prev = map.get(f.sku) ?? { rev: 0, units: 0, orders: 0, netProfit: null };
    prev.rev += f.revenue;
    prev.units += f.unitsSold;
    prev.orders += f.orderCount;
    if (f.netProfit != null) prev.netProfit = (prev.netProfit ?? 0) + f.netProfit;
    map.set(f.sku, prev);
  }

  return data.allProducts.map((p) => {
    const amz = amazonBySku.get(p.sku) ?? { rev: 0, units: 0, orders: 0, netProfit: null };
    const shop = shopifyBySku.get(p.sku) ?? { rev: 0, units: 0, orders: 0, netProfit: null };
    const fair = faireBySku.get(p.sku) ?? { rev: 0, units: 0, orders: 0, netProfit: null };
    const totalRev = amz.rev + shop.rev + fair.rev;
    const profits = [amz.netProfit, shop.netProfit, fair.netProfit].filter((p) => p != null);
    const netProfit = profits.length > 0 ? profits.reduce((s, p) => s + (p ?? 0), 0) : null;
    const marginPct = netProfit != null && totalRev > 0 ? netProfit / totalRev : null;
    return {
      sku: p.sku,
      asin: p.asin,
      productTitle: p.productTitle,
      channels: p.channels,
      amazonRev: amz.rev,
      shopifyRev: shop.rev,
      faireRev: fair.rev,
      totalRev,
      totalUnits: amz.units + shop.units + fair.units,
      totalOrders: amz.orders + shop.orders + fair.orders,
      netProfit,
      marginPct,
    };
  });
}

// ─── Shopify/Faire aggregation ────────────────────────────────────────────

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

export function aggregateShopifyProducts(
  channel: "shopify_dtc" | "faire",
  startDate?: string,
  endDate?: string
): ShopifyProductAggregate[] {
  const filtered = data.shopifyFacts.filter((f) => {
    if (f.channel !== channel) return false;
    if (startDate && f.weekStartDate < startDate) return false;
    if (endDate && f.weekStartDate > endDate) return false;
    return true;
  });

  const bySku = new Map<string, ShopifyFact[]>();
  for (const f of filtered) {
    if (!bySku.has(f.sku)) bySku.set(f.sku, []);
    bySku.get(f.sku)!.push(f);
  }

  const results: ShopifyProductAggregate[] = [];
  for (const [sku, weeks] of bySku) {
    const first = weeks[0];
    const revenue = weeks.reduce((s, w) => s + w.revenue, 0);
    const unitsSold = weeks.reduce((s, w) => s + w.unitsSold, 0);
    const orderCount = weeks.reduce((s, w) => s + w.orderCount, 0);
    const paymentFees = weeks.reduce((s, w) => s + w.paymentFees, 0);
    const netProceeds = weeks.reduce((s, w) => s + w.netProceeds, 0);
    const hasCogs = weeks.some((w) => w.hasCogs);

    const cogsWeeks = weeks.filter((w) => w.totalCogs != null);
    const totalCogs = cogsWeeks.length > 0 ? cogsWeeks.reduce((s, w) => s + (w.totalCogs ?? 0), 0) : null;

    const profitWeeks = weeks.filter((w) => w.netProfit != null);
    const netProfit = profitWeeks.length > 0 ? profitWeeks.reduce((s, w) => s + (w.netProfit ?? 0), 0) : null;

    const marginPct = netProfit != null && revenue > 0 ? netProfit / revenue : null;
    const avgPrice = unitsSold > 0 ? revenue / unitsSold : 0;

    results.push({
      sku, productTitle: first.productTitle, revenue, paymentFees,
      totalCogs, netProceeds, netProfit, marginPct, unitsSold, orderCount, avgPrice, hasCogs,
    });
  }

  return results;
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

// ─── Shopify/Faire per-SKU weekly data for detail charts ──────────────────

export function getShopifyProductWeekly(
  channel: "shopify_dtc" | "faire",
  sku: string,
  startDate?: string,
  endDate?: string
): ShopifyFact[] {
  return data.shopifyFacts
    .filter((f) => {
      if (f.channel !== channel) return false;
      if (f.sku !== sku) return false;
      if (startDate && f.weekStartDate < startDate) return false;
      if (endDate && f.weekStartDate > endDate) return false;
      return true;
    })
    .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
}

export interface ShopifyMonthlyRow {
  label: string;
  month: string;
  revenue: number;
  paymentFees: number;
  totalCogs: number | null;
  netProfit: number | null;
}

export function getShopifyProductMonthly(
  channel: "shopify_dtc" | "faire",
  sku: string,
  startDate?: string,
  endDate?: string
): ShopifyMonthlyRow[] {
  const weeks = getShopifyProductWeekly(channel, sku, startDate, endDate);
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

// ─── Channel hero chart data ──────────────────────────────────────────────

export function getChannelHeroData(channel: "shopify_dtc" | "faire") {
  const byWeek = new Map<string, { revenue: number; units: number; orders: number; netProfit: number | null; cogs: number | null }>();
  for (const f of data.shopifyFacts) {
    if (f.channel !== channel) continue;
    const prev = byWeek.get(f.weekStartDate);
    if (!prev) {
      byWeek.set(f.weekStartDate, {
        revenue: f.revenue, units: f.unitsSold, orders: f.orderCount,
        netProfit: f.netProfit, cogs: f.totalCogs,
      });
    } else {
      prev.revenue += f.revenue;
      prev.units += f.unitsSold;
      prev.orders += f.orderCount;
      if (f.netProfit != null) prev.netProfit = (prev.netProfit ?? 0) + f.netProfit;
      if (f.totalCogs != null) prev.cogs = (prev.cogs ?? 0) + f.totalCogs;
    }
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-52)
    .map(([week, d]) => ({
      week: formatWeekLabel(week),
      rawWeek: week,
      revenue: d.revenue, units: d.units, orders: d.orders,
      netProfit: d.netProfit, cogs: d.cogs,
    }));
}

// ─── Channel WoW KPIs (legacy, kept for compatibility) ──────────────────

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

export function getChannelWoWKpis(channel: "shopify_dtc" | "faire"): ChannelKpiData {
  const heroData = getChannelHeroData(channel);
  if (heroData.length < 2) {
    return {
      revenue: 0, fees: 0, netProceeds: 0, netProfit: null, unitsSold: 0,
      marginPct: null, cogs: null, avgOrderValue: 0,
      revenueChange: 0, feesChange: 0, netProceedsChange: 0, netProfitChange: null, unitsSoldChange: 0,
    };
  }

  const current = heroData[heroData.length - 1];
  const previous = heroData[heroData.length - 2];

  const pctChange = (curr: number | null, prev: number | null) => {
    if (curr == null || prev == null || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const safePct = (curr: number, prev: number) => {
    if (prev === 0) return 0;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const latestWeekFacts = data.shopifyFacts.filter(
    (f) => f.channel === channel && f.weekStartDate === current.rawWeek
  );
  const currentFees = latestWeekFacts.reduce((s, f) => s + f.paymentFees, 0);
  const prevWeekFacts = data.shopifyFacts.filter(
    (f) => f.channel === channel && f.weekStartDate === previous.rawWeek
  );
  const prevFees = prevWeekFacts.reduce((s, f) => s + f.paymentFees, 0);

  const marginPct = current.netProfit != null && current.revenue > 0
    ? current.netProfit / current.revenue
    : null;

  return {
    revenue: current.revenue, fees: currentFees,
    netProceeds: current.revenue - currentFees, netProfit: current.netProfit,
    unitsSold: current.units, marginPct, cogs: current.cogs,
    avgOrderValue: current.orders > 0 ? current.revenue / current.orders : 0,
    revenueChange: safePct(current.revenue, previous.revenue),
    feesChange: safePct(currentFees, prevFees),
    netProceedsChange: safePct(current.revenue - currentFees, previous.revenue - prevFees),
    netProfitChange: pctChange(current.netProfit, previous.netProfit),
    unitsSoldChange: safePct(current.units, previous.units),
  };
}

// ─── Product weekly data for detail chart ─────────────────────────────────

export function getProductWeeklyData(
  asin: string,
  startDate?: string,
  endDate?: string
): WeeklyFact[] {
  return data.weeklyFacts
    .filter((f) => {
      if (f.asin !== asin) return false;
      if (f.channel !== "amazon") return false;
      if (startDate && f.weekStartDate < startDate) return false;
      if (endDate && f.weekStartDate > endDate) return false;
      return true;
    })
    .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
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

export function getProductMonthlyData(
  asin: string,
  startDate?: string,
  endDate?: string
): MonthlyProductData[] {
  const weeks = getProductWeeklyData(asin, startDate, endDate);
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

// ─── Hero chart data: per-product weekly revenue for stacking ────────────

export function getProductWeeklyRevenue(asin: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of data.weeklyFacts) {
    if (f.asin !== asin) continue;
    if (f.channel !== "amazon") continue;
    map.set(f.weekStartDate, (map.get(f.weekStartDate) ?? 0) + f.revenue);
  }
  return map;
}

// ─── Ad data helpers ──────────────────────────────────────────────────────

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

export function getAdSummaryForRange(
  startDate: string,
  endDate: string
): {
  totalSpend: number;
  totalAdSales: number;
  acos: number;
  totalClicks: number;
  totalImpressions: number;
  ctr: number;
  cpc: number;
  totalOrders: number;
  weeklyData: { week: string; weekLabel: string; spend: number; acos: number }[];
  asinBreakdown: AdAsinAggregate[];
  hasData: boolean;
} {
  const filteredWeeks = data.adWeeklySummary.filter(
    (w) => w.week >= startDate && w.week <= endDate
  );

  if (filteredWeeks.length === 0) {
    return {
      totalSpend: 0, totalAdSales: 0, acos: 0, totalClicks: 0,
      totalImpressions: 0, ctr: 0, cpc: 0, totalOrders: 0,
      weeklyData: [], asinBreakdown: [], hasData: false,
    };
  }

  const totalSpend = filteredWeeks.reduce((s, w) => s + w.totalSpend, 0);
  const totalAdSales = filteredWeeks.reduce((s, w) => s + w.totalAdSales, 0);
  const totalClicks = filteredWeeks.reduce((s, w) => s + w.totalClicks, 0);
  const totalImpressions = filteredWeeks.reduce((s, w) => s + w.totalImpressions, 0);
  const totalOrders = filteredWeeks.reduce((s, w) => s + w.totalOrders, 0);
  const acos = totalAdSales > 0 ? totalSpend / totalAdSales : 0;
  const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  const weeklyData = filteredWeeks.map((w) => ({
    week: w.week,
    weekLabel: formatWeekLabel(w.week),
    spend: w.totalSpend,
    acos: w.acos,
  }));

  const asinMap = new Map<string, AdAsinAggregate>();
  for (const w of filteredWeeks) {
    for (const ab of w.asinBreakdown) {
      if (!asinMap.has(ab.asin)) {
        asinMap.set(ab.asin, {
          asin: ab.asin, sku: ab.sku, productTitle: ab.productTitle,
          spend: 0, adSales: 0, acos: 0, tacos: 0, totalRevenue: 0,
          impressions: 0, clicks: 0, ctr: 0, cpc: 0, orders: 0,
        });
      }
      const entry = asinMap.get(ab.asin)!;
      entry.spend += ab.spend;
      entry.adSales += ab.adSales;
      entry.impressions += ab.impressions;
      entry.clicks += ab.clicks;
      entry.orders += ab.orders;
      entry.totalRevenue += ab.totalRevenue;
    }
  }

  const asinBreakdown = Array.from(asinMap.values()).map((a) => ({
    ...a,
    acos: a.adSales > 0 ? a.spend / a.adSales : 0,
    tacos: a.totalRevenue > 0 ? a.spend / a.totalRevenue : 0,
    ctr: a.impressions > 0 ? a.clicks / a.impressions : 0,
    cpc: a.clicks > 0 ? a.spend / a.clicks : 0,
  }));

  return {
    totalSpend, totalAdSales, acos, totalClicks, totalImpressions,
    ctr, cpc, totalOrders, weeklyData, asinBreakdown, hasData: true,
  };
}

// ─── CSV export ───────────────────────────────────────────────────────────

export function exportProfitabilityCsv(
  products: ProductAggregate[],
  filename: string
) {
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

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Legacy WoW functions (kept for backward compat) ──────────────────────

export function getWoWKpis(): ProfitKpiData & { feeSource: "settlement" | "estimated" | null } {
  const hero = data.heroChartData;
  const current = hero[hero.length - 1];
  const previous = hero[hero.length - 2];

  const pctChange = (curr: number | null, prev: number | null) => {
    if (curr == null || prev == null || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const marginPct = current.netProfit != null && current.revenue > 0
    ? current.netProfit / current.revenue
    : null;

  return {
    revenue: current.revenue,
    totalAmazonFees: current.totalAmazonFees,
    netProceeds: current.netProceeds,
    netProfit: current.netProfit,
    unitsSold: current.units,
    marginPct,
    revenueChange: previous.revenue !== 0
      ? ((current.revenue - previous.revenue) / Math.abs(previous.revenue)) * 100
      : 0,
    feesChange: pctChange(current.totalAmazonFees, previous.totalAmazonFees),
    netProceedsChange: pctChange(current.netProceeds, previous.netProceeds),
    netProfitChange: pctChange(current.netProfit, previous.netProfit),
    unitsSoldChange: previous.units !== 0
      ? ((current.units - previous.units) / Math.abs(previous.units)) * 100
      : 0,
    feeSource: current.feeSource,
    comparisonLabel: "vs prior week",
  };
}

export function getOverviewWoWKpis() {
  const hero = data.unifiedHero;
  const current = hero[hero.length - 1];
  const previous = hero[hero.length - 2];

  const pctChange = (curr: number | null, prev: number | null) => {
    if (curr == null || prev == null || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const safePct = (curr: number, prev: number) => {
    if (prev === 0) return 0;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  return {
    totalRevenue: current.totalRevenue,
    amazonRevenue: current.amazonRevenue,
    shopifyRevenue: current.shopifyRevenue,
    faireRevenue: current.faireRevenue,
    totalNetProfit: current.totalNetProfit,
    totalUnits: current.totalUnits,
    totalRevenueChange: safePct(current.totalRevenue, previous.totalRevenue),
    amazonRevenueChange: safePct(current.amazonRevenue, previous.amazonRevenue),
    shopifyRevenueChange: safePct(current.shopifyRevenue, previous.shopifyRevenue),
    faireRevenueChange: safePct(current.faireRevenue, previous.faireRevenue),
    totalNetProfitChange: pctChange(current.totalNetProfit, previous.totalNetProfit),
    totalUnitsChange: safePct(current.totalUnits, previous.totalUnits),
  };
}
