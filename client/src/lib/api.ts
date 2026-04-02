/**
 * React Query hooks for all dashboard API endpoints.
 * All hooks use apiRequest from queryClient for __PORT_5000__ proxy support.
 */
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

// ─── Generic fetch helper ────────────────────────────────────────────────

async function fetchApi<T>(url: string): Promise<T> {
  const res = await apiRequest("GET", url);
  return res.json();
}

// ─── Types matching API responses ────────────────────────────────────────

/** Returned by useMeta() — derived from /api/weekly-chart min/max */
export interface MetaData {
  "dateRange.oldest": string;
  "dateRange.newest": string;
  generatedAt: string;
  meta: string; // JSON-encoded meta object (empty object for now)
  [key: string]: string;
}

/** Flat overview shape expected by components */
export interface OverviewData {
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
}

/** Raw response from /api/overview */
interface OverviewApiResponse {
  totals: {
    revenue: number;
    units: number;
    orders: number;
    netProfit: number;
    amazonFees: number;
    adSpend: number;
    cogs: number;
    paymentFees: number;
  };
  byChannel: Record<string, {
    revenue: number;
    units: number;
    orders: number;
    netProfit: number;
  }>;
  dateRange: { startDate: string; endDate: string };
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

/** Raw product row returned by /api/products */
interface RawProductRow {
  sku: string;
  asin: string | null;
  productTitle: string;
  channel: string;
  revenue: number;
  units: number;
  orders: number;
  amazonFees: number;
  paymentFees: number;
  netProceeds: number;
  cogs: number;
  adSpend: number;
  adSales: number;
  netProfit: number;
  margin: number | null;
  tacos: number | null;
  avgPrice: number | null;
  b2bRevenue: number;
  b2cRevenue: number;
  b2bUnits: number;
  refundUnits: number;
}

/** Normalized product row with consistent field names for components */
export interface ApiProductRow {
  sku: string;
  asin: string | null;
  productTitle: string;
  channel: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
  totalCogs: number | null;
  totalAmazonFees: number | null;
  netProceeds: number | null;
  adSpend: number | null;
  adSales: number | null;
  netProfit: number | null;
  marginPct: number | null;
  avgPrice: number;
  tacos: number | null;
  acos: number | null;
  refundAmount: number | null;
  paymentFees: number | null;
  hasCogs: boolean;
  avgUnitsPerOrder: number | null;
  revenuePerOrder: number | null;
  b2bRevenue: number | null;
  b2cRevenue: number | null;
  b2bUnits: number | null;
}

/** Unified product row for the Overview tab — aggregated across channels */
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

export interface WeeklyChartRow {
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
  totalAmazonFees: number | null;
  totalCogs: number | null;
  adSpend: number | null;
  adSales: number | null;
  organicSales: number | null;
  promotions: number | null;
  refundAmount: number | null;
  netProceeds: number | null;
  reimbursement: number | null;
  paymentFees: number | null;
}

/** Raw weekly-chart row from the server */
interface RawWeeklyChartRow {
  week: string;
  amazonRevenue: number;
  shopifyRevenue: number;
  faireRevenue: number;
  totalRevenue: number;
  totalNetProfit: number;
  totalUnits: number;
  totalOrders: number;
  totalAdSpend: number;
  totalAdSales: number;
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
  reimbursement: number | null;
}

export interface ChannelHeroRow {
  week: string;
  revenue: number;
  units: number;
  orders: number;
  netProfit: number | null;
  cogs: number | null;
}

export interface ProductDetailData {
  product: {
    id: number;
    sku: string;
    asin: string | null;
    productTitle: string;
    channels: string[] | null;
    isCore29: boolean | null;
  };
  weeklyMetrics: Array<Record<string, any>>;
  adData: Array<Record<string, any>>;
  cogsPeriods: Array<Record<string, any>>;
}

export interface AdData {
  totalSpend: number;
  totalAdSales: number;
  acos: number;
  totalClicks: number;
  totalImpressions: number;
  ctr: number;
  cpc: number;
  totalOrders: number;
  weeklyData: Array<{ week: string; spend: number; acos: number }>;
  asinBreakdown: Array<{
    asin: string;
    sku: string;
    productTitle: string;
    spend: number;
    adSales: number;
    impressions: number;
    clicks: number;
    orders: number;
    totalRevenue: number;
    acos: number;
    tacos: number;
    ctr: number;
    cpc: number;
  }>;
  hasData: boolean;
}

export interface ParetoProduct {
  sku: string;
  productTitle: string;
  revenue: number;
  netProfit: number | null;
  hasCogs: boolean;
  channels: string[];
}

export interface CatalogProduct {
  id: number;
  sku: string;
  asin: string | null;
  productTitle: string;
  channels: string[] | null;
  isCore29: boolean | null;
}

// ─── Normalization helpers ────────────────────────────────────────────────

/** Normalize raw /api/products row → ApiProductRow with consistent field names */
function normalizeProductRow(r: RawProductRow): ApiProductRow {
  const unitsSold = r.units ?? 0;
  const orderCount = r.orders ?? 0;
  return {
    sku: r.sku,
    asin: r.asin,
    productTitle: r.productTitle,
    channel: r.channel,
    revenue: r.revenue ?? 0,
    unitsSold,
    orderCount,
    totalCogs: r.cogs != null && r.cogs !== 0 ? r.cogs : null,
    totalAmazonFees: r.amazonFees != null && r.amazonFees !== 0 ? r.amazonFees : null,
    netProceeds: r.netProceeds != null ? r.netProceeds : null,
    adSpend: r.adSpend != null && r.adSpend !== 0 ? r.adSpend : null,
    adSales: r.adSales != null && r.adSales !== 0 ? r.adSales : null,
    netProfit: r.netProfit != null ? r.netProfit : null,
    marginPct: r.margin != null ? r.margin / 100 : null,
    avgPrice: r.avgPrice ?? (unitsSold > 0 ? (r.revenue ?? 0) / unitsSold : 0),
    tacos: r.tacos != null ? r.tacos / 100 : null,
    acos: (r.adSpend && r.adSales && r.adSales > 0) ? r.adSpend / r.adSales : null,
    refundAmount: null,
    paymentFees: r.paymentFees != null ? r.paymentFees : null,
    hasCogs: r.cogs != null && r.cogs > 0,
    avgUnitsPerOrder: orderCount > 0 ? unitsSold / orderCount : null,
    revenuePerOrder: orderCount > 0 ? (r.revenue ?? 0) / orderCount : null,
    b2bRevenue: r.b2bRevenue != null && r.b2bRevenue !== 0 ? r.b2bRevenue : null,
    b2cRevenue: r.b2cRevenue != null && r.b2cRevenue !== 0 ? r.b2cRevenue : null,
    b2bUnits: r.b2bUnits != null && r.b2bUnits !== 0 ? r.b2bUnits : null,
  };
}

/** Normalize raw /api/overview response → flat OverviewData */
function normalizeOverviewResponse(raw: OverviewApiResponse): OverviewData {
  const { totals, byChannel } = raw;
  const amazon = byChannel["amazon"] ?? { revenue: 0, units: 0, orders: 0, netProfit: 0 };
  const shopify = byChannel["shopify_dtc"] ?? { revenue: 0, units: 0, orders: 0, netProfit: 0 };
  const faire = byChannel["faire"] ?? { revenue: 0, units: 0, orders: 0, netProfit: 0 };

  return {
    totalRevenue: totals.revenue ?? 0,
    totalUnits: totals.units ?? 0,
    totalOrders: totals.orders ?? 0,
    totalNetProfit: totals.netProfit ?? null,
    totalAmazonFees: totals.amazonFees ?? null,
    totalAdSpend: totals.adSpend ?? null,
    amazonRevenue: amazon.revenue,
    shopifyRevenue: shopify.revenue,
    faireRevenue: faire.revenue,
    amazonUnits: amazon.units,
    shopifyUnits: shopify.units,
    faireUnits: faire.units,
  };
}

/** Aggregate /api/products rows into UnifiedProductRow[] (one row per SKU across channels) */
function buildUnifiedProducts(rows: ApiProductRow[]): UnifiedProductRow[] {
  const map: Record<string, UnifiedProductRow> = {};

  for (const r of rows) {
    if (!map[r.sku]) {
      map[r.sku] = {
        sku: r.sku,
        asin: r.asin,
        productTitle: r.productTitle,
        channels: [],
        amazonRev: 0,
        shopifyRev: 0,
        faireRev: 0,
        totalRev: 0,
        totalUnits: 0,
        totalOrders: 0,
        netProfit: null,
        marginPct: null,
      };
    }
    const u = map[r.sku];
    if (!u.channels.includes(r.channel)) u.channels.push(r.channel);
    if (r.channel === "amazon") u.amazonRev += r.revenue;
    else if (r.channel === "shopify_dtc") u.shopifyRev += r.revenue;
    else if (r.channel === "faire") u.faireRev += r.revenue;
    u.totalRev += r.revenue;
    u.totalUnits += r.unitsSold;
    u.totalOrders += r.orderCount;
    if (r.netProfit != null) {
      u.netProfit = (u.netProfit ?? 0) + r.netProfit;
    }
    // Update asin if we get one
    if (r.asin && !u.asin) u.asin = r.asin;
  }

  const result = Object.values(map);
  // Compute marginPct per unified row
  for (const u of result) {
    u.marginPct = u.netProfit != null && u.totalRev > 0 ? u.netProfit / u.totalRev : null;
  }
  return result.sort((a, b) => b.totalRev - a.totalRev);
}

/** Transform weekly chart raw rows into the full WeeklyChartRow shape */
function normalizeWeeklyChart(rows: RawWeeklyChartRow[]): WeeklyChartRow[] {
  return rows.map((r) => ({
    week: r.week,
    amazonRevenue: r.amazonRevenue ?? 0,
    shopifyRevenue: r.shopifyRevenue ?? 0,
    faireRevenue: r.faireRevenue ?? 0,
    totalRevenue: r.totalRevenue ?? 0,
    amazonUnits: 0,
    shopifyUnits: 0,
    faireUnits: 0,
    totalUnits: r.totalUnits ?? 0,
    amazonOrders: 0,
    shopifyOrders: 0,
    faireOrders: 0,
    totalOrders: r.totalOrders ?? 0,
    amazonNetProfit: null,
    shopifyNetProfit: null,
    faireNetProfit: null,
    totalNetProfit: r.totalNetProfit ?? null,
    totalAmazonFees: null,
    totalCogs: null,
    adSpend: r.totalAdSpend ?? null,
    adSales: r.totalAdSales ?? null,
    organicSales: null,
    promotions: null,
    refundAmount: null,
    netProceeds: null,
    reimbursement: null,
    paymentFees: null,
  }));
}

// ─── Query hooks ─────────────────────────────────────────────────────────

/**
 * useMeta — derive date range bounds from /api/weekly-chart.
 * Returns MetaData shape with dateRange.oldest, dateRange.newest, generatedAt.
 */
export function useMeta() {
  return useQuery<MetaData>({
    queryKey: ["/api/meta"],
    queryFn: async () => {
      const rows = await fetchApi<RawWeeklyChartRow[]>("/api/weekly-chart");
      const weeks = rows.map((r) => r.week).sort();
      const oldest = weeks[0] ?? "";
      const newest = weeks[weeks.length - 1] ?? "";
      return {
        "dateRange.oldest": oldest,
        "dateRange.newest": newest,
        generatedAt: new Date().toISOString(),
        meta: JSON.stringify({}),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * useOverview — GET /api/overview with date filters.
 * Transforms nested {totals, byChannel} response into flat OverviewData.
 */
export function useOverview(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<OverviewData>({
    queryKey: ["/api/overview", startDate, endDate],
    queryFn: async () => {
      const raw = await fetchApi<OverviewApiResponse>(`/api/overview${qs ? `?${qs}` : ""}`);
      return normalizeOverviewResponse(raw);
    },
    staleTime: 60000,
  });
}

/**
 * useChannelMix — GET /api/channel-mix with date filters.
 */
export function useChannelMix(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<ChannelMixRow[]>({
    queryKey: ["/api/channel-mix", startDate, endDate],
    queryFn: async () => {
      const rows = await fetchApi<any[]>(`/api/channel-mix${qs ? `?${qs}` : ""}`);
      return rows.map((r) => ({
        channel: r.channel ?? "",
        label: r.channel ?? "",
        revenue: r.revenue ?? 0,
        pctOfTotal: r.pctOfTotal ?? 0,
        orders: r.orders ?? 0,
        units: r.units ?? 0,
        netProfit: r.netProfit ?? null,
      }));
    },
    staleTime: 60000,
  });
}

/**
 * useProducts — GET /api/products with date + channel filters.
 * Normalizes field names (units→unitsSold, orders→orderCount, etc.)
 */
export function useProducts(startDate?: string, endDate?: string, channel?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (channel) params.set("channel", channel);
  const qs = params.toString();

  return useQuery<ApiProductRow[]>({
    queryKey: ["/api/products", startDate, endDate, channel],
    queryFn: async () => {
      const rows = await fetchApi<RawProductRow[]>(`/api/products${qs ? `?${qs}` : ""}`);
      return rows.map(normalizeProductRow);
    },
    staleTime: 60000,
  });
}

/**
 * useUnifiedProducts — GET /api/products (all channels) and aggregate by SKU.
 * Builds the per-product cross-channel summary for the Overview tab.
 */
export function useUnifiedProducts(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<UnifiedProductRow[]>({
    queryKey: ["/api/unified-products", startDate, endDate],
    queryFn: async () => {
      const rows = await fetchApi<RawProductRow[]>(`/api/products${qs ? `?${qs}` : ""}`);
      const normalized = rows.map(normalizeProductRow);
      return buildUnifiedProducts(normalized);
    },
    staleTime: 60000,
  });
}

/**
 * useWeeklyChart — GET /api/weekly-chart with optional date filters.
 */
export function useWeeklyChart(startDate?: string, endDate?: string, channel?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  // channel param not supported by server but kept for API compatibility
  const qs = params.toString();

  return useQuery<WeeklyChartRow[]>({
    queryKey: ["/api/weekly-chart", startDate, endDate, channel],
    queryFn: async () => {
      const rows = await fetchApi<RawWeeklyChartRow[]>(`/api/weekly-chart${qs ? `?${qs}` : ""}`);
      return normalizeWeeklyChart(rows);
    },
    staleTime: 60000,
  });
}

/**
 * useHeroChart — GET /api/weekly-chart (no date filter, all time).
 * Returns HeroChartRow[] with totalRevenue and netProfit per week.
 */
export function useHeroChart() {
  return useQuery<HeroChartRow[]>({
    queryKey: ["/api/hero-chart"],
    queryFn: async () => {
      const rows = await fetchApi<RawWeeklyChartRow[]>("/api/weekly-chart");
      return rows.map((r) => ({
        week: r.week,
        revenue: r.totalRevenue ?? 0,
        units: r.totalUnits ?? 0,
        orders: r.totalOrders ?? 0,
        totalAmazonFees: null,
        promotions: null,
        refunds: null,
        totalCogs: null,
        adSpend: r.totalAdSpend ?? null,
        adSales: r.totalAdSales ?? null,
        organicSales: null,
        netProceeds: null,
        netProfit: r.totalNetProfit ?? null,
        reimbursement: null,
      }));
    },
    staleTime: 60000,
  });
}

/**
 * useChannelHero — GET /api/weekly-chart and filter to a specific channel.
 * Returns ChannelHeroRow[] for the channel-specific hero chart.
 */
export function useChannelHero(channel: string) {
  return useQuery<ChannelHeroRow[]>({
    queryKey: ["/api/channel-hero", channel],
    queryFn: async () => {
      const rows = await fetchApi<RawWeeklyChartRow[]>("/api/weekly-chart");
      return rows.map((r) => {
        let revenue = 0;
        let netProfit: number | null = null;

        if (channel === "amazon") {
          revenue = r.amazonRevenue ?? 0;
        } else if (channel === "shopify_dtc") {
          revenue = r.shopifyRevenue ?? 0;
        } else if (channel === "faire") {
          revenue = r.faireRevenue ?? 0;
        } else {
          revenue = r.totalRevenue ?? 0;
        }

        // totalNetProfit is combined; per-channel not available from this endpoint
        // Use a proportional estimate if total revenue is known
        if (r.totalRevenue && r.totalRevenue > 0 && r.totalNetProfit != null) {
          netProfit = (revenue / r.totalRevenue) * r.totalNetProfit;
        }

        return {
          week: r.week,
          revenue,
          units: 0,
          orders: 0,
          netProfit,
          cogs: null,
        };
      });
    },
    staleTime: 60000,
  });
}

/**
 * useProductDetail — GET /api/product/:sku with date filters.
 */
export function useProductDetail(sku: string | null, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<ProductDetailData>({
    queryKey: ["/api/product", sku, startDate, endDate],
    queryFn: () => fetchApi(`/api/product/${sku}${qs ? `?${qs}` : ""}`),
    enabled: !!sku,
    staleTime: 60000,
  });
}

/**
 * useAdvertising — GET /api/advertising with date filters.
 * Transforms {kpis, weeklyTrend, asinBreakdown} into AdData shape.
 */
export function useAdvertising(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<AdData>({
    queryKey: ["/api/advertising", startDate, endDate],
    queryFn: async () => {
      const raw = await fetchApi<any>(`/api/advertising${qs ? `?${qs}` : ""}`);
      const kpis = raw.kpis ?? {};
      const weeklyTrend: any[] = raw.weeklyTrend ?? [];
      const asinBreakdown: any[] = raw.asinBreakdown ?? [];

      return {
        totalSpend: kpis.totalSpend ?? 0,
        totalAdSales: kpis.totalAdSales ?? 0,
        acos: kpis.acos ?? 0,
        totalClicks: kpis.totalClicks ?? 0,
        totalImpressions: kpis.totalImpressions ?? 0,
        ctr: kpis.ctr ?? 0,
        cpc: kpis.cpc ?? 0,
        totalOrders: weeklyTrend.reduce((s: number, r: any) => s + (r.totalOrders ?? 0), 0),
        weeklyData: weeklyTrend.map((r: any) => ({
          week: r.week,
          spend: r.totalSpend ?? 0,
          acos: r.acos ?? 0,
        })),
        asinBreakdown: asinBreakdown.map((r: any) => ({
          asin: r.asin ?? "",
          sku: r.sku ?? "",
          productTitle: r.productTitle ?? "",
          spend: r.spend ?? 0,
          adSales: r.adSales ?? 0,
          impressions: r.impressions ?? 0,
          clicks: r.clicks ?? 0,
          orders: r.orders ?? 0,
          totalRevenue: r.totalRevenue ?? 0,
          acos: r.acos ?? 0,
          tacos: r.tacos ?? 0,
          ctr: r.ctr ?? 0,
          cpc: r.cpc ?? 0,
        })),
        hasData: asinBreakdown.length > 0,
      };
    },
    staleTime: 60000,
  });
}

/**
 * usePareto — GET /api/pareto with date filters.
 * Returns the products array from the {products, summary} response.
 */
export function usePareto(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<any>({
    queryKey: ["/api/pareto", startDate, endDate],
    queryFn: () => fetchApi(`/api/pareto${qs ? `?${qs}` : ""}`),
    staleTime: 60000,
  });
}

/**
 * useProductsCatalog — GET /api/products-catalog (all products, no date filter).
 */
export function useProductsCatalog() {
  return useQuery<CatalogProduct[]>({
    queryKey: ["/api/products-catalog"],
    queryFn: () => fetchApi("/api/products-catalog"),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * useCogsPeriods — GET /api/cogs-periods with optional SKU filter.
 */
export function useCogsPeriods(sku?: string) {
  const params = new URLSearchParams();
  if (sku) params.set("sku", sku);
  const qs = params.toString();

  return useQuery({
    queryKey: ["/api/cogs-periods", sku],
    queryFn: () => fetchApi(`/api/cogs-periods${qs ? `?${qs}` : ""}`),
    staleTime: 60000,
  });
}

/**
 * useProductWeeklyRevenue — GET /api/product/:sku and extract weekly revenue map.
 * Returns { [weekDate]: revenue } for the given ASIN.
 * Looks up the SKU from the products catalog via the ASIN.
 */
export function useProductWeeklyRevenue(asin: string | null) {
  // First, get the catalog to find the SKU for this ASIN
  const { data: catalog } = useProductsCatalog();

  const sku = asin && catalog
    ? catalog.find((p) => p.asin === asin)?.sku ?? null
    : null;

  return useQuery<Record<string, number>>({
    queryKey: ["/api/product-weekly-revenue", asin],
    queryFn: async () => {
      if (!sku) return {};
      const detail = await fetchApi<ProductDetailData>(`/api/product/${sku}`);
      const revMap: Record<string, number> = {};
      for (const row of detail.weeklyMetrics ?? []) {
        const week = row.weekStartDate ?? row.week;
        const channel = row.channel ?? "";
        // Sum amazon revenue for this ASIN across all weeks
        if (week && channel === "amazon") {
          revMap[week] = (revMap[week] ?? 0) + (row.revenue ?? 0);
        }
      }
      return revMap;
    },
    enabled: !!asin && !!sku,
    staleTime: 60000,
  });
}
