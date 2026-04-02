import { useState, useMemo, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, BarChart, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Calculator,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency, formatCurrencyPrecise, formatNumber, formatPercent, formatWeekLabel,
  CHANNEL_COLORS, CHANNEL_LABELS, CHANNEL_BADGE_LABELS,
} from "@/lib/data";
import { useMeta, useProductDetail, useProductsCatalog } from "@/lib/api";
import type { ProductDetailData } from "@/lib/api";
import { UnitEconomicsDrawer } from "@/components/UnitEconomicsDrawer";

// Date helpers
function subtractWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - weeks * 7);
  return d.toISOString().slice(0, 10);
}
function getYTDStart(dateStr: string): string {
  return `${new Date(dateStr + "T00:00:00").getFullYear()}-01-01`;
}

interface ChannelWeekly {
  week: string;
  weekLabel: string;
  amazonRevenue: number;
  shopifyRevenue: number;
  faireRevenue: number;
  totalRevenue: number;
  amazonUnits: number;
  shopifyUnits: number;
  faireUnits: number;
  amazonOrders: number;
  shopifyOrders: number;
  faireOrders: number;
  amazonAvgPrice: number | null;
  shopifyAvgPrice: number | null;
  faireAvgPrice: number | null;
  amazonAdSpend: number | null;
  shopifyAdSpend: null;
  faireAdSpend: null;
  amazonNetProfit: number | null;
  shopifyNetProfit: number | null;
  faireNetProfit: number | null;
  totalNetProfit: number | null;
  // fees
  amazonFees: number | null;
  shopifyFees: number;
  faireFees: number;
  amazonCogs: number | null;
  shopifyCogs: number | null;
  faireCogs: number | null;
  // settlement detail
  amazonReferralFee: number | null;
  fbaFulfillmentFee: number | null;
  promotions: number | null;
  refundAmount: number | null;
  reimbursement: number | null;
}

function buildProductWeeklyData(
  product: { sku: string; asin: string | null; channels: string[] },
  weeklyMetrics: Array<Record<string, any>>,
  adData: Array<Record<string, any>>,
  startDate: string,
  endDate: string
): ChannelWeekly[] {
  // Collect Amazon data by week
  const amazonByWeek = new Map<string, Array<Record<string, any>>>();
  if (product.asin) {
    for (const f of weeklyMetrics) {
      if (f.channel !== "amazon") continue;
      if (f.weekStartDate < startDate || (f.weekEndDate && f.weekEndDate > endDate)) continue;
      if (!amazonByWeek.has(f.weekStartDate)) amazonByWeek.set(f.weekStartDate, []);
      amazonByWeek.get(f.weekStartDate)!.push(f);
    }
  }

  // Collect Shopify/Faire data by week
  const shopifyByWeek = new Map<string, Array<Record<string, any>>>();
  const faireByWeek = new Map<string, Array<Record<string, any>>>();
  for (const f of weeklyMetrics) {
    if (f.channel !== "shopify_dtc" && f.channel !== "faire") continue;
    if (f.weekStartDate < startDate || f.weekStartDate > endDate) continue;
    const map = f.channel === "shopify_dtc" ? shopifyByWeek : faireByWeek;
    if (!map.has(f.weekStartDate)) map.set(f.weekStartDate, []);
    map.get(f.weekStartDate)!.push(f);
  }

  // Collect ad data by week for this ASIN
  const adByWeek = new Map<string, number>();
  if (product.asin) {
    for (const w of adData) {
      if (w.weekStartDate < startDate || w.weekStartDate > endDate) continue;
      adByWeek.set(w.weekStartDate, (adByWeek.get(w.weekStartDate) ?? 0) + (Number(w.spend) || 0));
    }
  }

  // Union all weeks
  const allWeeks = new Set<string>();
  amazonByWeek.forEach((_, k) => allWeeks.add(k));
  shopifyByWeek.forEach((_, k) => allWeeks.add(k));
  faireByWeek.forEach((_, k) => allWeeks.add(k));

  const sorted = Array.from(allWeeks).sort();

  return sorted.map((week) => {
    const amzFacts = amazonByWeek.get(week) ?? [];
    const shopFacts = shopifyByWeek.get(week) ?? [];
    const fairFacts = faireByWeek.get(week) ?? [];

    const amazonRevenue = amzFacts.reduce((s, f) => s + (Number(f.revenue) || 0), 0);
    const shopifyRevenue = shopFacts.reduce((s, f) => s + (Number(f.revenue) || 0), 0);
    const faireRevenue = fairFacts.reduce((s, f) => s + (Number(f.revenue) || 0), 0);

    const amazonUnits = amzFacts.reduce((s, f) => s + (Number(f.unitsSold) || 0), 0);
    const shopifyUnits = shopFacts.reduce((s, f) => s + (Number(f.unitsSold) || 0), 0);
    const faireUnits = fairFacts.reduce((s, f) => s + (Number(f.unitsSold) || 0), 0);

    const amazonOrders = amzFacts.reduce((s, f) => s + (Number(f.orderCount) || 0), 0);
    const shopifyOrders = shopFacts.reduce((s, f) => s + (Number(f.orderCount) || 0), 0);
    const faireOrders = fairFacts.reduce((s, f) => s + (Number(f.orderCount) || 0), 0);

    const amazonAvgPrice = amazonUnits > 0 ? amazonRevenue / amazonUnits : null;
    const shopifyAvgPrice = shopifyUnits > 0 ? shopifyRevenue / shopifyUnits : null;
    const faireAvgPrice = faireUnits > 0 ? faireRevenue / faireUnits : null;

    const amazonAdSpend = adByWeek.get(week) ?? null;

    // Fees
    const feeAmzW = amzFacts.filter((f) => f.totalAmazonFees != null);
    const amazonFees = feeAmzW.length > 0 ? feeAmzW.reduce((s, f) => s + (Number(f.totalAmazonFees) ?? 0), 0) : null;
    const shopifyFees = shopFacts.reduce((s, f) => s + (Number(f.paymentFees) || 0), 0);
    const faireFees = fairFacts.reduce((s, f) => s + (Number(f.paymentFees) || 0), 0);

    // COGS
    const cogsAmzW = amzFacts.filter((f) => f.totalCogs != null);
    const amazonCogs = cogsAmzW.length > 0 ? cogsAmzW.reduce((s, f) => s + (Number(f.totalCogs) ?? 0), 0) : null;
    const cogsShopW = shopFacts.filter((f) => f.totalCogs != null);
    const shopifyCogs = cogsShopW.length > 0 ? cogsShopW.reduce((s, f) => s + (Number(f.totalCogs) ?? 0), 0) : null;
    const cogsFlW = fairFacts.filter((f) => f.totalCogs != null);
    const faireCogs = cogsFlW.length > 0 ? cogsFlW.reduce((s, f) => s + (Number(f.totalCogs) ?? 0), 0) : null;

    // Net profit
    const npAmzW = amzFacts.filter((f) => f.netProfit != null);
    const amazonNetProfit = npAmzW.length > 0 ? npAmzW.reduce((s, f) => s + (Number(f.netProfit) ?? 0), 0) : null;
    const npShopW = shopFacts.filter((f) => f.netProfit != null);
    const shopifyNetProfit = npShopW.length > 0 ? npShopW.reduce((s, f) => s + (Number(f.netProfit) ?? 0), 0) : null;
    const npFlW = fairFacts.filter((f) => f.netProfit != null);
    const faireNetProfit = npFlW.length > 0 ? npFlW.reduce((s, f) => s + (Number(f.netProfit) ?? 0), 0) : null;

    const profits = [amazonNetProfit, shopifyNetProfit, faireNetProfit].filter((p) => p != null);
    const totalNetProfit = profits.length > 0 ? profits.reduce((s, p) => s + (p ?? 0), 0) : null;

    // Settlement details
    const refFeeW = amzFacts.filter((f) => f.amazonReferralFee != null);
    const amazonReferralFee = refFeeW.length > 0 ? refFeeW.reduce((s, f) => s + (Number(f.amazonReferralFee) ?? 0), 0) : null;
    const fbaW = amzFacts.filter((f) => f.fbaFulfillmentFee != null);
    const fbaFulfillmentFee = fbaW.length > 0 ? fbaW.reduce((s, f) => s + (Number(f.fbaFulfillmentFee) ?? 0), 0) : null;
    const promoW = amzFacts.filter((f) => f.promotions != null);
    const promotions = promoW.length > 0 ? promoW.reduce((s, f) => s + (Number(f.promotions) ?? 0), 0) : null;
    const refW = amzFacts.filter((f) => f.refundAmount != null);
    const refundAmount = refW.length > 0 ? refW.reduce((s, f) => s + (Number(f.refundAmount) ?? 0), 0) : null;
    const reimbW = amzFacts.filter((f) => f.reimbursement != null);
    const reimbursement = reimbW.length > 0 ? reimbW.reduce((s, f) => s + (Number(f.reimbursement) ?? 0), 0) : null;

    return {
      week,
      weekLabel: formatWeekLabel(week),
      amazonRevenue, shopifyRevenue, faireRevenue,
      totalRevenue: amazonRevenue + shopifyRevenue + faireRevenue,
      amazonUnits, shopifyUnits, faireUnits,
      amazonOrders, shopifyOrders, faireOrders,
      amazonAvgPrice, shopifyAvgPrice, faireAvgPrice,
      amazonAdSpend, shopifyAdSpend: null, faireAdSpend: null,
      amazonNetProfit, shopifyNetProfit, faireNetProfit, totalNetProfit,
      amazonFees, shopifyFees, faireFees,
      amazonCogs, shopifyCogs, faireCogs,
      amazonReferralFee, fbaFulfillmentFee, promotions, refundAmount, reimbursement,
    };
  });
}

// Monthly aggregation
function aggregateToMonthly(weekly: ChannelWeekly[]): (ChannelWeekly & { monthLabel: string })[] {
  const byMonth = new Map<string, ChannelWeekly[]>();
  for (const w of weekly) {
    const d = new Date(w.week + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(w);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, weeks]) => {
      const d = new Date(month + "-01T00:00:00");
      const monthLabel = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      const sumN = (fn: (w: ChannelWeekly) => number) => weeks.reduce((s, w) => s + fn(w), 0);
      const sumNullable = (fn: (w: ChannelWeekly) => number | null) => {
        const vals = weeks.map(fn).filter((v) => v != null);
        return vals.length > 0 ? vals.reduce((s, v) => s + (v ?? 0), 0) : null;
      };

      const amazonRevenue = sumN((w) => w.amazonRevenue);
      const shopifyRevenue = sumN((w) => w.shopifyRevenue);
      const faireRevenue = sumN((w) => w.faireRevenue);
      const amazonUnits = sumN((w) => w.amazonUnits);
      const shopifyUnits = sumN((w) => w.shopifyUnits);
      const faireUnits = sumN((w) => w.faireUnits);

      return {
        week: month,
        weekLabel: monthLabel,
        monthLabel,
        amazonRevenue, shopifyRevenue, faireRevenue,
        totalRevenue: amazonRevenue + shopifyRevenue + faireRevenue,
        amazonUnits, shopifyUnits, faireUnits,
        amazonOrders: sumN((w) => w.amazonOrders),
        shopifyOrders: sumN((w) => w.shopifyOrders),
        faireOrders: sumN((w) => w.faireOrders),
        amazonAvgPrice: amazonUnits > 0 ? amazonRevenue / amazonUnits : null,
        shopifyAvgPrice: shopifyUnits > 0 ? shopifyRevenue / shopifyUnits : null,
        faireAvgPrice: faireUnits > 0 ? faireRevenue / faireUnits : null,
        amazonAdSpend: sumNullable((w) => w.amazonAdSpend),
        shopifyAdSpend: null as null,
        faireAdSpend: null as null,
        amazonNetProfit: sumNullable((w) => w.amazonNetProfit),
        shopifyNetProfit: sumNullable((w) => w.shopifyNetProfit),
        faireNetProfit: sumNullable((w) => w.faireNetProfit),
        totalNetProfit: sumNullable((w) => w.totalNetProfit),
        amazonFees: sumNullable((w) => w.amazonFees),
        shopifyFees: sumN((w) => w.shopifyFees),
        faireFees: sumN((w) => w.faireFees),
        amazonCogs: sumNullable((w) => w.amazonCogs),
        shopifyCogs: sumNullable((w) => w.shopifyCogs),
        faireCogs: sumNullable((w) => w.faireCogs),
        amazonReferralFee: sumNullable((w) => w.amazonReferralFee),
        fbaFulfillmentFee: sumNullable((w) => w.fbaFulfillmentFee),
        promotions: sumNullable((w) => w.promotions),
        refundAmount: sumNullable((w) => w.refundAmount),
        reimbursement: sumNullable((w) => w.reimbursement),
      };
    });
}

type ChannelKey = "amazon" | "shopify_dtc" | "faire";

// Trend calculations
interface TrendIndicator {
  label: string;
  detail: string;
  trend: "up" | "down" | "neutral" | "insufficient";
}

function calculateTrends(
  weekly: ChannelWeekly[],
  activeChannels: Set<ChannelKey>
): TrendIndicator[] {
  const trends: TrendIndicator[] = [];
  if (weekly.length < 8) {
    return [
      { label: "Revenue Trend", detail: "Insufficient data", trend: "insufficient" },
      { label: "Margin Trend", detail: "Insufficient data", trend: "insufficient" },
      { label: "Ad Efficiency", detail: "Insufficient data", trend: "insufficient" },
      { label: "Channel Mix", detail: "Insufficient data", trend: "insufficient" },
    ];
  }

  const recent4 = weekly.slice(-4);
  const prior4 = weekly.slice(-8, -4);

  const channelRev = (w: ChannelWeekly) => {
    let r = 0;
    if (activeChannels.has("amazon")) r += w.amazonRevenue;
    if (activeChannels.has("shopify_dtc")) r += w.shopifyRevenue;
    if (activeChannels.has("faire")) r += w.faireRevenue;
    return r;
  };

  // Revenue trend
  const recentRev = recent4.reduce((s, w) => s + channelRev(w), 0);
  const priorRev = prior4.reduce((s, w) => s + channelRev(w), 0);
  if (priorRev > 0) {
    const revPct = ((recentRev - priorRev) / priorRev) * 100;
    trends.push({
      label: "Revenue Trend",
      detail: `Revenue ${revPct >= 0 ? "increasing" : "declining"} ${Math.abs(revPct).toFixed(1)}% over last 4 weeks`,
      trend: revPct > 2 ? "up" : revPct < -2 ? "down" : "neutral",
    });
  } else {
    trends.push({ label: "Revenue Trend", detail: "Insufficient data", trend: "insufficient" });
  }

  // Margin trend
  const recentProfit = recent4.reduce((s, w) => {
    let p = 0;
    if (activeChannels.has("amazon") && w.amazonNetProfit != null) p += w.amazonNetProfit;
    if (activeChannels.has("shopify_dtc") && w.shopifyNetProfit != null) p += w.shopifyNetProfit;
    if (activeChannels.has("faire") && w.faireNetProfit != null) p += w.faireNetProfit;
    return s + p;
  }, 0);
  const currentMargin = recentRev > 0 ? (recentProfit / recentRev) * 100 : null;
  const priorProfit = prior4.reduce((s, w) => {
    let p = 0;
    if (activeChannels.has("amazon") && w.amazonNetProfit != null) p += w.amazonNetProfit;
    if (activeChannels.has("shopify_dtc") && w.shopifyNetProfit != null) p += w.shopifyNetProfit;
    if (activeChannels.has("faire") && w.faireNetProfit != null) p += w.faireNetProfit;
    return s + p;
  }, 0);
  const priorMargin = priorRev > 0 ? (priorProfit / priorRev) * 100 : null;

  if (currentMargin != null) {
    const marginDir = priorMargin != null ? (currentMargin > priorMargin ? "improving" : currentMargin < priorMargin ? "declining" : "stable") : "—";
    trends.push({
      label: "Margin Trend",
      detail: `Margin ${marginDir} — currently ${currentMargin.toFixed(1)}%`,
      trend: marginDir === "improving" ? "up" : marginDir === "declining" ? "down" : "neutral",
    });
  } else {
    trends.push({ label: "Margin Trend", detail: "Insufficient data", trend: "insufficient" });
  }

  // Ad efficiency (TACOS)
  const recentAdSpend = recent4.reduce((s, w) => s + (w.amazonAdSpend ?? 0), 0);
  const priorAdSpend = prior4.reduce((s, w) => s + (w.amazonAdSpend ?? 0), 0);
  const hasAdData = recent4.some((w) => w.amazonAdSpend != null);
  if (hasAdData && recentRev > 0 && priorRev > 0) {
    const currentTacos = (recentAdSpend / recentRev) * 100;
    const priorTacos = (priorAdSpend / priorRev) * 100;
    const improving = currentTacos < priorTacos;
    trends.push({
      label: "Ad Efficiency",
      detail: `TACOS ${improving ? "improving" : "worsening"} — ${currentTacos.toFixed(1)}% current vs ${priorTacos.toFixed(1)}% prior`,
      trend: improving ? "up" : "down",
    });
  } else {
    trends.push({ label: "Ad Efficiency", detail: hasAdData ? "Insufficient data" : "No ad data available", trend: "insufficient" });
  }

  // Channel mix shift
  if (activeChannels.has("amazon") && (activeChannels.has("shopify_dtc") || activeChannels.has("faire"))) {
    const recentAmz = recent4.reduce((s, w) => s + w.amazonRevenue, 0);
    const priorAmz = prior4.reduce((s, w) => s + w.amazonRevenue, 0);
    const recentAmzPct = recentRev > 0 ? (recentAmz / recentRev) * 100 : 0;
    const priorAmzPct = priorRev > 0 ? (priorAmz / priorRev) * 100 : 0;
    const growing = recentAmzPct > priorAmzPct;
    trends.push({
      label: "Channel Mix",
      detail: `Amazon share ${growing ? "growing" : "shrinking"} — was ${priorAmzPct.toFixed(1)}%, now ${recentAmzPct.toFixed(1)}%`,
      trend: growing ? "neutral" : "neutral",
    });
  } else {
    trends.push({ label: "Channel Mix", detail: "Single channel product", trend: "neutral" });
  }

  return trends;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 mt-0.5" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-64" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex-1 w-full space-y-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <Skeleton className="h-[340px] w-full" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-1 pt-3 px-4">
                <Skeleton className="h-4 w-36" />
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <Skeleton className="h-[220px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function ProductPage() {
  const [, params] = useRoute("/product/:sku");
  const [, setLocation] = useLocation();
  const sku = params?.sku ? decodeURIComponent(params.sku) : null;

  // Fetch meta for date range
  const { data: metaData, isLoading: metaLoading } = useMeta();

  const maxDate = metaData?.["dateRange.newest"] ?? "";
  const minDate = metaData?.["dateRange.oldest"] ?? "";

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [activeChannels, setActiveChannels] = useState<Set<ChannelKey>>(new Set<ChannelKey>(["amazon", "shopify_dtc", "faire"]));
  const [timeScale, setTimeScale] = useState<"weekly" | "monthly">("weekly");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Initialize date range from meta once it loads
  const effectiveDateRange = useMemo(() => {
    if (dateRange) return dateRange;
    if (minDate && maxDate) return { start: minDate, end: maxDate };
    return null;
  }, [dateRange, minDate, maxDate]);

  // Fetch product detail data from the API
  const { data: detailData, isLoading: detailLoading } = useProductDetail(
    sku,
    effectiveDateRange?.start,
    effectiveDateRange?.end,
  );

  // Fetch catalog for product lookup (used as fallback for product info)
  const { data: catalog, isLoading: catalogLoading } = useProductsCatalog();

  // Build the product object from the API response
  const product = useMemo(() => {
    if (detailData?.product) {
      const p = detailData.product;
      return {
        sku: p.sku,
        asin: p.asin,
        productTitle: p.productTitle,
        channels: p.channels ?? [],
      };
    }
    // Fallback to catalog if detail hasn't loaded yet
    if (catalog && sku) {
      const found = catalog.find((c) => c.sku === sku);
      if (found) {
        return {
          sku: found.sku,
          asin: found.asin,
          productTitle: found.productTitle,
          channels: found.channels ?? [],
        };
      }
    }
    return null;
  }, [detailData, catalog, sku]);

  const weeklyData = useMemo(() => {
    if (!product || !detailData || !effectiveDateRange) return [];
    return buildProductWeeklyData(
      product,
      detailData.weeklyMetrics ?? [],
      detailData.adData ?? [],
      effectiveDateRange.start,
      effectiveDateRange.end,
    );
  }, [product, detailData, effectiveDateRange]);

  const monthlyData = useMemo(() => aggregateToMonthly(weeklyData), [weeklyData]);
  const rawChartData = useMemo(() => timeScale === "weekly" ? weeklyData : monthlyData, [timeScale, weeklyData, monthlyData]);

  // Derive visibleNetProfit from active channel toggles
  const chartData = useMemo(() => rawChartData.map((d) => {
    let visibleNetProfit: number | null = null;
    const parts: (number | null)[] = [];
    if (activeChannels.has("amazon")) parts.push(d.amazonNetProfit);
    if (activeChannels.has("shopify_dtc")) parts.push(d.shopifyNetProfit);
    if (activeChannels.has("faire")) parts.push(d.faireNetProfit);
    const valid = parts.filter((p) => p != null);
    if (valid.length > 0) visibleNetProfit = valid.reduce((s, v) => s + (v ?? 0), 0);
    return { ...d, visibleNetProfit };
  }), [rawChartData, activeChannels]);

  const trendIndicators = useMemo(() => calculateTrends(weeklyData, activeChannels), [weeklyData, activeChannels]);

  const toggleChannel = useCallback((ch: ChannelKey) => {
    setActiveChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) {
        if (next.size > 1) next.delete(ch);
      } else {
        next.add(ch);
      }
      return next;
    });
  }, []);

  // Aggregated totals for the comparison table
  const periodTotals = useMemo(() => {
    if (weeklyData.length === 0) return null;

    const sumN = (fn: (w: ChannelWeekly) => number) => weeklyData.reduce((s, w) => s + fn(w), 0);
    const sumNullable = (fn: (w: ChannelWeekly) => number | null) => {
      const vals = weeklyData.map(fn).filter((v) => v != null);
      return vals.length > 0 ? vals.reduce((s, v) => s + (v ?? 0), 0) : null;
    };

    const amzRev = sumN((w) => w.amazonRevenue);
    const shopRev = sumN((w) => w.shopifyRevenue);
    const flRev = sumN((w) => w.faireRevenue);
    const amzUnits = sumN((w) => w.amazonUnits);
    const shopUnits = sumN((w) => w.shopifyUnits);
    const flUnits = sumN((w) => w.faireUnits);

    return {
      amazon: {
        revenue: amzRev,
        units: amzUnits,
        orders: sumN((w) => w.amazonOrders),
        avgPrice: amzUnits > 0 ? amzRev / amzUnits : null,
        cogs: sumNullable((w) => w.amazonCogs),
        fees: sumNullable((w) => w.amazonFees),
        adSpend: sumNullable((w) => w.amazonAdSpend),
        netProfit: sumNullable((w) => w.amazonNetProfit),
      },
      shopify_dtc: {
        revenue: shopRev,
        units: shopUnits,
        orders: sumN((w) => w.shopifyOrders),
        avgPrice: shopUnits > 0 ? shopRev / shopUnits : null,
        cogs: sumNullable((w) => w.shopifyCogs),
        fees: shopRev > 0 ? sumN((w) => w.shopifyFees) : null,
        adSpend: null as number | null,
        netProfit: sumNullable((w) => w.shopifyNetProfit),
      },
      faire: {
        revenue: flRev,
        units: flUnits,
        orders: sumN((w) => w.faireOrders),
        avgPrice: flUnits > 0 ? flRev / flUnits : null,
        cogs: sumNullable((w) => w.faireCogs),
        fees: flRev > 0 ? sumN((w) => w.faireFees) : null,
        adSpend: null as number | null,
        netProfit: sumNullable((w) => w.faireNetProfit),
      },
    };
  }, [weeklyData]);

  const presets = useMemo(() => {
    if (!maxDate || !minDate) return [];
    return [
      { label: "Last Week", start: subtractWeeks(maxDate, 1), end: maxDate },
      { label: "4W", start: subtractWeeks(maxDate, 4), end: maxDate },
      { label: "12W", start: subtractWeeks(maxDate, 12), end: maxDate },
      { label: "26W", start: subtractWeeks(maxDate, 26), end: maxDate },
      { label: "YTD", start: getYTDStart(maxDate), end: maxDate },
      { label: "All", start: minDate, end: maxDate },
    ];
  }, [minDate, maxDate]);

  const activePreset = useMemo(() => {
    if (!effectiveDateRange) return undefined;
    return presets.find((p) => p.start === effectiveDateRange.start && p.end === effectiveDateRange.end)?.label;
  }, [presets, effectiveDateRange]);

  // Loading state
  const isLoading = metaLoading || detailLoading || catalogLoading;
  if (isLoading && !product) {
    return <LoadingSkeleton />;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold text-foreground">Product not found</p>
          <p className="text-sm text-muted-foreground">SKU "{sku}" does not exist</p>
          <Button variant="outline" onClick={() => setLocation("/")} data-testid="btn-back-to-overview">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Overview
          </Button>
        </div>
      </div>
    );
  }

  const hasAmazon = product.channels.includes("amazon");
  const hasShopify = product.channels.includes("shopify_dtc");
  const hasFaire = product.channels.includes("faire");
  const hasAnyAdData = weeklyData.some((w) => w.amazonAdSpend != null);

  const ChannelToggle = ({ channel, label }: { channel: ChannelKey; label: string }) => {
    const active = activeChannels.has(channel);
    const available = product.channels.includes(channel === "shopify_dtc" ? "shopify_dtc" : channel);
    if (!available) return null;
    return (
      <Button
        variant={active ? "default" : "outline"}
        size="sm"
        className="h-6 text-[10px] px-2 gap-1"
        style={active ? { backgroundColor: CHANNEL_COLORS[channel], borderColor: CHANNEL_COLORS[channel] } : {}}
        onClick={() => toggleChannel(channel)}
        data-testid={`toggle-channel-${channel}`}
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? "#fff" : CHANNEL_COLORS[channel] }} />
        {label}
      </Button>
    );
  };

  const trendColor = (t: TrendIndicator["trend"]) =>
    t === "up" ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
    : t === "down" ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    : "text-muted-foreground bg-muted/50 border-border";

  const TrendIcon = ({ trend }: { trend: TrendIndicator["trend"] }) =>
    trend === "up" ? <TrendingUp className="w-3.5 h-3.5" />
    : trend === "down" ? <TrendingDown className="w-3.5 h-3.5" />
    : <Minus className="w-3.5 h-3.5" />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 mt-0.5"
                onClick={() => setLocation("/")}
                data-testid="btn-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="space-y-1">
                <h1 className="text-lg font-semibold text-foreground leading-tight" data-testid="product-title">
                  {product.productTitle}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground" data-testid="product-sku">{product.sku}</span>
                  {product.asin && (
                    <span className="text-xs font-mono text-muted-foreground" data-testid="product-asin">ASIN: {product.asin}</span>
                  )}
                  <div className="flex gap-1">
                    {hasAmazon && <Badge variant="outline" className="h-4 text-[9px] px-1 text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700">AMZ</Badge>}
                    {hasShopify && <Badge variant="outline" className="h-4 text-[9px] px-1 text-green-600 border-green-300 dark:text-green-400 dark:border-green-700">SHOP</Badge>}
                    {hasFaire && <Badge variant="outline" className="h-4 text-[9px] px-1 text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-700">FAIRE</Badge>}
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setDrawerOpen(true)}
              data-testid="btn-unit-economics"
            >
              <Calculator className="w-3.5 h-3.5" />
              Unit Economics
            </Button>
          </div>

          {/* Date range presets */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Period:</span>
            {presets.map((p) => (
              <Button
                key={p.label}
                variant={activePreset === p.label ? "default" : "outline"}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setDateRange({ start: p.start, end: p.end })}
                data-testid={`product-preset-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex-1 w-full space-y-4">
        {/* Section 1: Cross-Channel Revenue Chart */}
        <Card data-testid="cross-channel-chart">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cross-Channel Revenue
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <ChannelToggle channel="amazon" label="Amazon" />
                  <ChannelToggle channel="shopify_dtc" label="Shopify" />
                  <ChannelToggle channel="faire" label="Faire" />
                </div>
                <div className="flex border border-border rounded-md overflow-hidden">
                  <button
                    className={`px-2 py-0.5 text-[10px] ${timeScale === "weekly" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                    onClick={() => setTimeScale("weekly")}
                    data-testid="btn-weekly"
                  >
                    Weekly
                  </button>
                  <button
                    className={`px-2 py-0.5 text-[10px] ${timeScale === "monthly" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                    onClick={() => setTimeScale("monthly")}
                    data-testid="btn-monthly"
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={55} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={55} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs max-w-[280px]">
                      <p className="font-medium mb-1 text-foreground">{label}</p>
                      {activeChannels.has("amazon") && hasAmazon && <p className="tabular-nums" style={{ color: CHANNEL_COLORS.amazon }}>Amazon: {formatCurrency(d?.amazonRevenue)}</p>}
                      {activeChannels.has("shopify_dtc") && hasShopify && <p className="tabular-nums" style={{ color: CHANNEL_COLORS.shopify_dtc }}>Shopify: {formatCurrency(d?.shopifyRevenue)}</p>}
                      {activeChannels.has("faire") && hasFaire && <p className="tabular-nums" style={{ color: CHANNEL_COLORS.faire }}>Faire: {formatCurrency(d?.faireRevenue)}</p>}
                      <p className="tabular-nums font-medium text-foreground mt-1 border-t border-border pt-1">
                        Total: {formatCurrency(
                          (activeChannels.has("amazon") ? (d?.amazonRevenue ?? 0) : 0) +
                          (activeChannels.has("shopify_dtc") ? (d?.shopifyRevenue ?? 0) : 0) +
                          (activeChannels.has("faire") ? (d?.faireRevenue ?? 0) : 0)
                        )}
                      </p>
                      {d?.visibleNetProfit != null && <p className="tabular-nums text-emerald-500">Net Profit: {formatCurrency(d.visibleNetProfit)}</p>}
                    </div>
                  );
                }} />
                {activeChannels.has("amazon") && hasAmazon && (
                  <Bar yAxisId="left" dataKey="amazonRevenue" fill={CHANNEL_COLORS.amazon} fillOpacity={0.85} stackId="rev" name="Amazon" />
                )}
                {activeChannels.has("shopify_dtc") && hasShopify && (
                  <Bar yAxisId="left" dataKey="shopifyRevenue" fill={CHANNEL_COLORS.shopify_dtc} fillOpacity={0.85} stackId="rev" name="Shopify" />
                )}
                {activeChannels.has("faire") && hasFaire && (
                  <Bar yAxisId="left" dataKey="faireRevenue" fill={CHANNEL_COLORS.faire} fillOpacity={0.85} stackId="rev" name="Faire" radius={[2, 2, 0, 0]} />
                )}
                <Line yAxisId="right" type="monotone" dataKey="visibleNetProfit" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} name="Net Profit" connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Section 2: Trend Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="trend-indicators">
          {trendIndicators.map((t, i) => (
            <Card key={i} className={`border ${trendColor(t.trend)}`} data-testid={`trend-${i}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendIcon trend={t.trend} />
                  <span className="text-xs font-semibold">{t.label}</span>
                </div>
                <p className="text-[11px] leading-snug">{t.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section 3: Metric Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chart A: Revenue by Channel */}
          <Card data-testid="chart-revenue">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Revenue by Channel</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={50} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                        <p className="font-medium mb-1 text-foreground">{label}</p>
                        {payload.map((p: any) => (
                          <p key={p.dataKey} className="tabular-nums" style={{ color: p.stroke }}>{p.name}: {formatCurrency(p.value)}</p>
                        ))}
                      </div>
                    );
                  }} />
                  {activeChannels.has("amazon") && hasAmazon && <Line type="monotone" dataKey="amazonRevenue" stroke={CHANNEL_COLORS.amazon} strokeWidth={2} dot={false} name="Amazon" />}
                  {activeChannels.has("shopify_dtc") && hasShopify && <Line type="monotone" dataKey="shopifyRevenue" stroke={CHANNEL_COLORS.shopify_dtc} strokeWidth={2} dot={false} name="Shopify" />}
                  {activeChannels.has("faire") && hasFaire && <Line type="monotone" dataKey="faireRevenue" stroke={CHANNEL_COLORS.faire} strokeWidth={2} dot={false} name="Faire" />}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart B: Ad Spend */}
          <Card data-testid="chart-ad-spend">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Ad Spend by Channel</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              {!hasAnyAdData ? (
                <div className="h-[220px] flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">Ad data available from Jan 20, 2026</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="weekLabel" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={50} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                          <p className="font-medium mb-1 text-foreground">{label}</p>
                          {payload.map((p: any) => (
                            <p key={p.dataKey} className="tabular-nums" style={{ color: p.stroke }}>{p.name}: {p.value != null ? formatCurrency(p.value) : "—"}</p>
                          ))}
                        </div>
                      );
                    }} />
                    {activeChannels.has("amazon") && hasAmazon && <Line type="monotone" dataKey="amazonAdSpend" stroke={CHANNEL_COLORS.amazon} strokeWidth={2} dot={false} name="Amazon Ad Spend" connectNulls />}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart C: Units Sold */}
          <Card data-testid="chart-units">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Units Sold by Channel</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatNumber(v)} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                        <p className="font-medium mb-1 text-foreground">{label}</p>
                        {payload.map((p: any) => (
                          <p key={p.dataKey} className="tabular-nums" style={{ color: p.fill }}>{p.name}: {formatNumber(p.value)}</p>
                        ))}
                      </div>
                    );
                  }} />
                  {activeChannels.has("amazon") && hasAmazon && <Bar dataKey="amazonUnits" fill={CHANNEL_COLORS.amazon} fillOpacity={0.85} name="Amazon" />}
                  {activeChannels.has("shopify_dtc") && hasShopify && <Bar dataKey="shopifyUnits" fill={CHANNEL_COLORS.shopify_dtc} fillOpacity={0.85} name="Shopify" />}
                  {activeChannels.has("faire") && hasFaire && <Bar dataKey="faireUnits" fill={CHANNEL_COLORS.faire} fillOpacity={0.85} name="Faire" />}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart D: Avg Unit Price */}
          <Card data-testid="chart-avg-price">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avg Unit Price by Channel</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                        <p className="font-medium mb-1 text-foreground">{label}</p>
                        {payload.map((p: any) => (
                          <p key={p.dataKey} className="tabular-nums" style={{ color: p.stroke }}>{p.name}: {p.value != null ? formatCurrencyPrecise(p.value) : "—"}</p>
                        ))}
                      </div>
                    );
                  }} />
                  {activeChannels.has("amazon") && hasAmazon && <Line type="monotone" dataKey="amazonAvgPrice" stroke={CHANNEL_COLORS.amazon} strokeWidth={2} dot={false} name="Amazon" connectNulls />}
                  {activeChannels.has("shopify_dtc") && hasShopify && <Line type="monotone" dataKey="shopifyAvgPrice" stroke={CHANNEL_COLORS.shopify_dtc} strokeWidth={2} dot={false} name="Shopify" connectNulls />}
                  {activeChannels.has("faire") && hasFaire && <Line type="monotone" dataKey="faireAvgPrice" stroke={CHANNEL_COLORS.faire} strokeWidth={2} dot={false} name="Faire" connectNulls />}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Section 4: Channel Performance Table */}
        {periodTotals && (
          <Card data-testid="channel-performance-table">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Channel Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-medium pl-4 min-w-[120px]">Metric</TableHead>
                      {hasAmazon && <TableHead className="text-xs font-medium text-right px-3" style={{ color: CHANNEL_COLORS.amazon }}>Amazon</TableHead>}
                      {hasShopify && <TableHead className="text-xs font-medium text-right px-3" style={{ color: CHANNEL_COLORS.shopify_dtc }}>Shopify</TableHead>}
                      {hasFaire && <TableHead className="text-xs font-medium text-right px-3" style={{ color: CHANNEL_COLORS.faire }}>Faire</TableHead>}
                      <TableHead className="text-xs font-semibold text-right px-3">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      {
                        label: "Revenue",
                        fn: (ch: typeof periodTotals.amazon) => ch.revenue > 0 ? formatCurrency(ch.revenue) : "—",
                        total: () => formatCurrency((hasAmazon ? periodTotals.amazon.revenue : 0) + (hasShopify ? periodTotals.shopify_dtc.revenue : 0) + (hasFaire ? periodTotals.faire.revenue : 0)),
                      },
                      {
                        label: "Units",
                        fn: (ch: typeof periodTotals.amazon) => ch.units > 0 ? formatNumber(ch.units) : "—",
                        total: () => formatNumber((hasAmazon ? periodTotals.amazon.units : 0) + (hasShopify ? periodTotals.shopify_dtc.units : 0) + (hasFaire ? periodTotals.faire.units : 0)),
                      },
                      {
                        label: "Orders",
                        fn: (ch: typeof periodTotals.amazon) => ch.orders > 0 ? formatNumber(ch.orders) : "—",
                        total: () => formatNumber((hasAmazon ? periodTotals.amazon.orders : 0) + (hasShopify ? periodTotals.shopify_dtc.orders : 0) + (hasFaire ? periodTotals.faire.orders : 0)),
                      },
                      {
                        label: "Avg Price",
                        fn: (ch: typeof periodTotals.amazon) => ch.avgPrice != null ? formatCurrencyPrecise(ch.avgPrice) : "—",
                        total: () => {
                          const totalRev = (hasAmazon ? periodTotals.amazon.revenue : 0) + (hasShopify ? periodTotals.shopify_dtc.revenue : 0) + (hasFaire ? periodTotals.faire.revenue : 0);
                          const totalUnits = (hasAmazon ? periodTotals.amazon.units : 0) + (hasShopify ? periodTotals.shopify_dtc.units : 0) + (hasFaire ? periodTotals.faire.units : 0);
                          return totalUnits > 0 ? formatCurrencyPrecise(totalRev / totalUnits) : "—";
                        },
                      },
                      {
                        label: "COGS",
                        fn: (ch: typeof periodTotals.amazon) => ch.cogs != null ? formatCurrency(ch.cogs) : "—",
                        total: () => {
                          const vals = [periodTotals.amazon.cogs, periodTotals.shopify_dtc.cogs, periodTotals.faire.cogs].filter((v) => v != null);
                          return vals.length > 0 ? formatCurrency(vals.reduce((s, v) => s + (v ?? 0), 0)) : "—";
                        },
                      },
                      {
                        label: "Fees",
                        fn: (ch: typeof periodTotals.amazon) => ch.fees != null ? formatCurrency(ch.fees) : "—",
                        total: () => {
                          const vals = [periodTotals.amazon.fees, periodTotals.shopify_dtc.fees, periodTotals.faire.fees].filter((v) => v != null);
                          return vals.length > 0 ? formatCurrency(vals.reduce((s, v) => s + (v ?? 0), 0)) : "—";
                        },
                      },
                      {
                        label: "Ad Spend",
                        fn: (ch: typeof periodTotals.amazon) => ch.adSpend != null ? formatCurrency(ch.adSpend) : "—",
                        total: () => {
                          const vals = [periodTotals.amazon.adSpend, periodTotals.shopify_dtc.adSpend, periodTotals.faire.adSpend].filter((v) => v != null);
                          return vals.length > 0 ? formatCurrency(vals.reduce((s, v) => s + (v ?? 0), 0)) : "—";
                        },
                      },
                      {
                        label: "Net Profit (before overhead)",
                        fn: (ch: typeof periodTotals.amazon) => ch.netProfit != null ? formatCurrency(ch.netProfit) : "—",
                        total: () => {
                          const vals = [periodTotals.amazon.netProfit, periodTotals.shopify_dtc.netProfit, periodTotals.faire.netProfit].filter((v) => v != null);
                          return vals.length > 0 ? formatCurrency(vals.reduce((s, v) => s + (v ?? 0), 0)) : "—";
                        },
                        isProfit: true,
                      },
                      {
                        label: "Margin %",
                        fn: (ch: typeof periodTotals.amazon) => ch.netProfit != null && ch.revenue > 0 ? `${((ch.netProfit / ch.revenue) * 100).toFixed(1)}%` : "—",
                        total: () => {
                          const totalRev = (hasAmazon ? periodTotals.amazon.revenue : 0) + (hasShopify ? periodTotals.shopify_dtc.revenue : 0) + (hasFaire ? periodTotals.faire.revenue : 0);
                          const vals = [periodTotals.amazon.netProfit, periodTotals.shopify_dtc.netProfit, periodTotals.faire.netProfit].filter((v) => v != null);
                          const totalProfit = vals.length > 0 ? vals.reduce((s, v) => s + (v ?? 0), 0) : null;
                          return totalProfit != null && totalRev > 0 ? `${((totalProfit / totalRev) * 100).toFixed(1)}%` : "—";
                        },
                        isProfit: true,
                      },
                    ].map((row) => (
                      <TableRow key={row.label}>
                        <TableCell className="pl-4 text-xs font-medium">{row.label}</TableCell>
                        {hasAmazon && <TableCell className={`text-right text-xs tabular-nums px-3 ${(row as any).isProfit ? "font-medium" : ""}`}>{row.fn(periodTotals.amazon)}</TableCell>}
                        {hasShopify && <TableCell className={`text-right text-xs tabular-nums px-3 ${(row as any).isProfit ? "font-medium" : ""}`}>{row.fn(periodTotals.shopify_dtc)}</TableCell>}
                        {hasFaire && <TableCell className={`text-right text-xs tabular-nums px-3 ${(row as any).isProfit ? "font-medium" : ""}`}>{row.fn(periodTotals.faire)}</TableCell>}
                        <TableCell className={`text-right text-xs tabular-nums px-3 font-semibold ${(row as any).isProfit ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{row.total()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Unit Economics Drawer */}
      <UnitEconomicsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={product}
        dateRange={effectiveDateRange ?? { start: "", end: "" }}
        weeklyData={weeklyData}
      />
    </div>
  );
}
