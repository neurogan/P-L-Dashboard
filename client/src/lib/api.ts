/**
 * React Query hooks for all dashboard API endpoints.
 * Replaces the static JSON data import.
 */
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

// ─── Generic fetch helper ────────────────────────────────────────────────

async function fetchApi<T>(url: string): Promise<T> {
  const res = await apiRequest("GET", url);
  return res.json();
}

// ─── Types matching API responses ────────────────────────────────────────

export interface MetaData {
  "dateRange.oldest": string;
  "dateRange.newest": string;
  generatedAt: string;
  meta: string; // JSON-encoded meta object
  [key: string]: string;
}

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

export interface ChannelMixRow {
  channel: string;
  label: string;
  revenue: number;
  pctOfTotal: number;
  orders: number;
  units: number;
  netProfit: number | null;
}

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

// ─── Query hooks ─────────────────────────────────────────────────────────

export function useMeta() {
  return useQuery<MetaData>({
    queryKey: ["/api/meta"],
    queryFn: () => fetchApi("/api/meta"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOverview(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<OverviewData>({
    queryKey: ["/api/overview", startDate, endDate],
    queryFn: () => fetchApi(`/api/overview${qs ? `?${qs}` : ""}`),
  });
}

export function useChannelMix(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<ChannelMixRow[]>({
    queryKey: ["/api/channel-mix", startDate, endDate],
    queryFn: () => fetchApi(`/api/channel-mix${qs ? `?${qs}` : ""}`),
  });
}

export function useProducts(startDate?: string, endDate?: string, channel?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (channel) params.set("channel", channel);
  const qs = params.toString();

  return useQuery<ApiProductRow[]>({
    queryKey: ["/api/products", startDate, endDate, channel],
    queryFn: () => fetchApi(`/api/products${qs ? `?${qs}` : ""}`),
  });
}

export function useUnifiedProducts(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<UnifiedProductRow[]>({
    queryKey: ["/api/unified-products", startDate, endDate],
    queryFn: () => fetchApi(`/api/unified-products${qs ? `?${qs}` : ""}`),
  });
}

export function useWeeklyChart(startDate?: string, endDate?: string, channel?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (channel) params.set("channel", channel);
  const qs = params.toString();

  return useQuery<WeeklyChartRow[]>({
    queryKey: ["/api/weekly-chart", startDate, endDate, channel],
    queryFn: () => fetchApi(`/api/weekly-chart${qs ? `?${qs}` : ""}`),
  });
}

export function useHeroChart() {
  return useQuery<HeroChartRow[]>({
    queryKey: ["/api/hero-chart"],
    queryFn: () => fetchApi("/api/hero-chart"),
  });
}

export function useProductWeeklyRevenue(asin: string | null) {
  return useQuery<Record<string, number>>({
    queryKey: ["/api/product-weekly-revenue", asin],
    queryFn: () => fetchApi(`/api/product-weekly-revenue/${asin}`),
    enabled: !!asin,
  });
}

export function useChannelHero(channel: string) {
  return useQuery<ChannelHeroRow[]>({
    queryKey: ["/api/channel-hero", channel],
    queryFn: () => fetchApi(`/api/channel-hero/${channel}`),
  });
}

export function useProductDetail(sku: string | null, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<ProductDetailData>({
    queryKey: ["/api/product", sku, startDate, endDate],
    queryFn: () => fetchApi(`/api/product/${sku}${qs ? `?${qs}` : ""}`),
    enabled: !!sku,
  });
}

export function useAdvertising(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<AdData>({
    queryKey: ["/api/advertising", startDate, endDate],
    queryFn: () => fetchApi(`/api/advertising${qs ? `?${qs}` : ""}`),
  });
}

export function usePareto(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();

  return useQuery<ParetoProduct[]>({
    queryKey: ["/api/pareto", startDate, endDate],
    queryFn: () => fetchApi(`/api/pareto${qs ? `?${qs}` : ""}`),
  });
}

export function useProductsCatalog() {
  return useQuery<CatalogProduct[]>({
    queryKey: ["/api/products-catalog"],
    queryFn: () => fetchApi("/api/products-catalog"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCogsPeriods(sku?: string) {
  const params = new URLSearchParams();
  if (sku) params.set("sku", sku);
  const qs = params.toString();

  return useQuery({
    queryKey: ["/api/cogs-periods", sku],
    queryFn: () => fetchApi(`/api/cogs-periods${qs ? `?${qs}` : ""}`),
  });
}
