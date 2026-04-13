import { useState, useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBrand } from "@/lib/brand-context";
import {
  ProductAggregate,
  useProductDetail,
  computeMonthlyFromWeekly,
  computeShopifyMonthly,
  formatCurrency,
  formatPercent,
  formatWeekLabel,
  WeeklyFact,
  ShopifyFact,
  CHANNEL_COLORS,
} from "@/lib/data";

type Granularity = "weekly" | "monthly";

const COLORS = {
  adSales: "#7c3aed",
  organic: "#3b82f6",
  totalSales: "#3b82f6",
  adSpend: "#ec4899",
  revenue: "#3b82f6",
  netProfit: "#22c55e",
  tacos: "#f59e0b",
  acos: "#ef4444",
  margin: "#22c55e",
};

function FeeIndicator({ feeSource }: { feeSource: string | null }) {
  if (feeSource === "settlement") return <span className="text-emerald-500" title="Real settlement data">●</span>;
  if (feeSource === "estimated") return <span className="text-amber-500" title="Estimated fees">~</span>;
  if (feeSource === "mixed") return <span className="text-amber-500" title="Mixed (some estimated)">~</span>;
  return null;
}

// ─── Amazon Product Drawer ────────────────────────────────────────────────

interface Props {
  product: ProductAggregate | null;
  dateRange: { start: string; end: string };
  onClose: () => void;
  open: boolean;
}

export function ProductDetailDrawer({ product, dateRange, onClose, open }: Props) {
  const { brandId } = useBrand();
  const [granularity, setGranularity] = useState<Granularity>("weekly");

  const { data: detail } = useProductDetail(brandId,

    product?.sku ?? "",
    dateRange.start,
    dateRange.end,
  );

  // Filter weekly metrics to Amazon channel only
  const weeklyData: WeeklyFact[] = useMemo(() => {
    if (!detail?.weeklyMetrics) return [];
    return detail.weeklyMetrics.filter((w: any) => w.channel === "amazon");
  }, [detail?.weeklyMetrics]);

  const monthlyData = useMemo(
    () => computeMonthlyFromWeekly(weeklyData),
    [weeklyData]
  );

  const chartRows = useMemo(() => {
    if (!product) return [];
    if (granularity === "monthly") {
      return monthlyData.map((m) => ({
        label: m.label, revenue: m.revenue, adSales: m.adSales, organicSales: m.organicSales,
        adSpend: m.adSpend, netProfit: m.netProfit, feeSource: m.feeSource,
        tacos: m.adSpend != null && m.revenue > 0 ? m.adSpend / m.revenue : null,
        acos: m.adSpend != null && m.adSales != null && m.adSales > 0 ? m.adSpend / m.adSales : null,
        marginPct: m.netProfit != null && m.revenue > 0 ? m.netProfit / m.revenue : null,
      }));
    }
    return weeklyData.map((w: WeeklyFact) => ({
      label: formatWeekLabel(w.weekStartDate), revenue: w.revenue, adSales: w.adSales,
      organicSales: w.organicSales, adSpend: w.adSpend, netProfit: w.netProfit, feeSource: w.feeSource,
      tacos: w.adSpend != null && w.revenue > 0 ? w.adSpend / w.revenue : null,
      acos: w.adSpend != null && w.adSales != null && w.adSales > 0 ? w.adSpend / w.adSales : null,
      marginPct: w.netProfit != null && w.revenue > 0 ? w.netProfit / w.revenue : null,
    }));
  }, [weeklyData, monthlyData, granularity, product]);

  const hasAnyAdData = weeklyData.some((w) => w.hasAdData);

  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-[50vw] max-w-none sm:max-w-none p-0 flex flex-col"
        data-testid="product-detail-drawer"
      >
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-border flex-shrink-0">
          <SheetTitle className="text-sm font-semibold leading-tight pr-8">
            {product.productTitle}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] h-5 font-mono">{product.asin}</Badge>
              <Badge variant="outline" className="text-[10px] h-5 font-mono">{product.sku}</Badge>
            </div>
          </SheetDescription>
          <div className="flex items-center gap-1 mt-3">
            {(["weekly", "monthly"] as Granularity[]).map((g) => (
              <Button key={g} variant={granularity === g ? "default" : "outline"} size="sm" className="h-6 text-[10px] px-2.5"
                onClick={() => setGranularity(g)} data-testid={`drawer-granularity-${g}`}>
                {g === "weekly" ? "Weekly" : "Monthly"}
              </Button>
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Chart 1: Sales */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-1">Sales</h3>
              <p className="text-[10px] text-muted-foreground mb-2">Revenue breakdown</p>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartRows} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={50} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} width={35} domain={[0, "auto"]} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                        <p className="font-medium mb-1 text-foreground">{label}</p>
                        <p className="tabular-nums" style={{ color: COLORS.totalSales }}>Revenue: {formatCurrency(d?.revenue)}</p>
                        {d?.adSales != null && <p className="tabular-nums" style={{ color: COLORS.adSales }}>Ad Sales: {formatCurrency(d.adSales)}</p>}
                        {d?.organicSales != null && <p className="tabular-nums" style={{ color: COLORS.organic }}>Organic: {formatCurrency(d.organicSales)}</p>}
                        {d?.tacos != null && <p className="tabular-nums" style={{ color: COLORS.tacos }}>TACOS: {formatPercent(d.tacos)}</p>}
                      </div>
                    );
                  }} />
                  {hasAnyAdData ? (
                    <>
                      <Bar yAxisId="left" dataKey="organicSales" fill={COLORS.organic} fillOpacity={0.8} stackId="sales" name="Organic" />
                      <Bar yAxisId="left" dataKey="adSales" fill={COLORS.adSales} fillOpacity={0.8} stackId="sales" name="Ad Sales" radius={[2, 2, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="tacos" stroke={COLORS.tacos} strokeWidth={2} dot={false} name="TACOS" connectNulls />
                    </>
                  ) : (
                    <Bar yAxisId="left" dataKey="revenue" fill={COLORS.totalSales} fillOpacity={0.8} radius={[2, 2, 0, 0]} name="Revenue" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Ad Spend | Ad Sales */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-1">Ad Spend | Ad Sales</h3>
              <p className="text-[10px] text-muted-foreground mb-2">Advertising performance</p>
              {hasAnyAdData ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={chartRows} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={50} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} width={35} domain={[0, "auto"]} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                          <p className="font-medium mb-1 text-foreground">{label}</p>
                          {d?.adSales != null && <p className="tabular-nums" style={{ color: COLORS.adSales }}>Ad Sales: {formatCurrency(d.adSales)}</p>}
                          {d?.adSpend != null && <p className="tabular-nums" style={{ color: COLORS.adSpend }}>Ad Spend: {formatCurrency(d.adSpend)}</p>}
                          {d?.acos != null && <p className="tabular-nums" style={{ color: COLORS.acos }}>ACOS: {formatPercent(d.acos)}</p>}
                        </div>
                      );
                    }} />
                    <Bar yAxisId="left" dataKey="adSales" fill={COLORS.adSales} fillOpacity={0.8} name="Ad Sales" />
                    <Bar yAxisId="left" dataKey="adSpend" fill={COLORS.adSpend} fillOpacity={0.8} name="Ad Spend" />
                    <Line yAxisId="right" type="monotone" dataKey="acos" stroke={COLORS.acos} strokeWidth={2} dot={false} name="ACOS" connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[120px] flex items-center justify-center rounded-md border border-dashed border-border">
                  <p className="text-xs text-muted-foreground">No ad data for this period</p>
                </div>
              )}
            </div>

            {/* Chart 3: Profitability */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-1">Profitability</h3>
              <p className="text-[10px] text-muted-foreground mb-2">
                Revenue vs Net Profit
                {product.feeSource && (
                  <span className="ml-2"><FeeIndicator feeSource={product.feeSource} />
                    <span className="ml-0.5">{product.feeSource === "settlement" ? "Settlement" : product.feeSource === "estimated" ? "Estimated" : "Mixed"} fees</span>
                  </span>
                )}
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartRows} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={50} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} width={35} domain={["auto", "auto"]} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                        <p className="font-medium mb-1 text-foreground">{label} <FeeIndicator feeSource={d?.feeSource} /></p>
                        <p className="tabular-nums" style={{ color: COLORS.revenue }}>Revenue: {formatCurrency(d?.revenue)}</p>
                        {d?.netProfit != null && <p className="tabular-nums font-medium" style={{ color: COLORS.netProfit }}>Net Profit: {formatCurrency(d.netProfit)}</p>}
                        {d?.marginPct != null && <p className="tabular-nums" style={{ color: COLORS.margin }}>Margin: {formatPercent(d.marginPct)}</p>}
                      </div>
                    );
                  }} />
                  <Bar yAxisId="left" dataKey="revenue" fill={COLORS.revenue} fillOpacity={0.3} name="Revenue" />
                  <Bar yAxisId="left" dataKey="netProfit" fill={COLORS.netProfit} fillOpacity={0.8} name="Net Profit" radius={[2, 2, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="marginPct" stroke={COLORS.margin} strokeWidth={2} dot={false} name="Margin %" connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── Shopify/Faire Drawer ────────────────────────────────────────────────

interface ShopifyDrawerProps {
  product: { sku: string; productTitle: string } | null;
  channel: "shopify_dtc" | "faire";
  dateRange: { start: string; end: string };
  onClose: () => void;
  open: boolean;
}

export function ShopifyDetailDrawer({ product, channel, dateRange, onClose, open }: ShopifyDrawerProps) {
  const [granularity, setGranularity] = useState<Granularity>("weekly");
  const channelColor = CHANNEL_COLORS[channel];

  const { data: detail } = useProductDetail(brandId,

    product?.sku ?? "",
    dateRange.start,
    dateRange.end,
  );

  // Filter weekly metrics to this channel and adapt to ShopifyFact shape
  const weeklyData: ShopifyFact[] = useMemo(() => {
    if (!detail?.weeklyMetrics) return [];
    return detail.weeklyMetrics
      .filter((w: any) => w.channel === channel)
      .map((w: any): ShopifyFact => ({
        channel: w.channel,
        sku: w.sku,
        productTitle: w.productTitle ?? "",
        weekStartDate: w.weekStartDate,
        revenue: w.revenue ?? 0,
        unitsSold: w.unitsSold ?? 0,
        orderCount: w.orderCount ?? 0,
        avgUnitPrice: w.avgUnitPrice ?? 0,
        cogsPerUnit: w.cogsPerUnit,
        totalCogs: w.totalCogs,
        hasCogs: w.hasCogs ?? false,
        paymentFees: w.totalAmazonFees != null ? Math.abs(w.totalAmazonFees) : 0,
        netProceeds: w.netProceeds ?? w.revenue,
        netProfit: w.netProfit,
        feeSource: w.feeSource ?? "",
        avgUnitsPerOrder: w.avgUnitsPerOrder ?? null,
        revenuePerOrder: w.revenuePerOrder ?? null,
        sessions: w.sessions ?? null,
        conversionRate: w.conversionRate ?? null,
        avgTimeOnPage: null,
        activeSubscriptions: w.activeSubscriptions ?? null,
      }));
  }, [detail?.weeklyMetrics, channel]);

  const monthlyData = useMemo(
    () => computeShopifyMonthly(weeklyData),
    [weeklyData]
  );

  const chartRows = useMemo(() => {
    if (!product) return [];
    if (granularity === "monthly") {
      return monthlyData.map((m) => ({
        label: m.label, revenue: m.revenue, netProfit: m.netProfit,
        marginPct: m.netProfit != null && m.revenue > 0 ? m.netProfit / m.revenue : null,
      }));
    }
    return weeklyData.map((w) => ({
      label: formatWeekLabel(w.weekStartDate), revenue: w.revenue, netProfit: w.netProfit,
      marginPct: w.netProfit != null && w.revenue > 0 ? w.netProfit / w.revenue : null,
    }));
  }, [weeklyData, monthlyData, granularity, product]);

  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[50vw] max-w-none sm:max-w-none p-0 flex flex-col" data-testid="shopify-detail-drawer">
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-border flex-shrink-0">
          <SheetTitle className="text-sm font-semibold leading-tight pr-8">{product.productTitle}</SheetTitle>
          <SheetDescription asChild>
            <Badge variant="outline" className="text-[10px] h-5 font-mono mt-1 w-fit">{product.sku}</Badge>
          </SheetDescription>
          <div className="flex items-center gap-1 mt-3">
            {(["weekly", "monthly"] as Granularity[]).map((g) => (
              <Button key={g} variant={granularity === g ? "default" : "outline"} size="sm" className="h-6 text-[10px] px-2.5"
                onClick={() => setGranularity(g)} data-testid={`shopify-drawer-granularity-${g}`}>
                {g === "weekly" ? "Weekly" : "Monthly"}
              </Button>
            ))}
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-1">Sales</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartRows} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={50} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                        <p className="font-medium mb-1 text-foreground">{label}</p>
                        <p className="tabular-nums" style={{ color: channelColor }}>Revenue: {formatCurrency(d?.revenue)}</p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="revenue" fill={channelColor} fillOpacity={0.85} radius={[2, 2, 0, 0]} name="Revenue" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-1">Profitability</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartRows} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={50} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} width={35} domain={["auto", "auto"]} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                        <p className="font-medium mb-1 text-foreground">{label}</p>
                        <p className="tabular-nums" style={{ color: channelColor }}>Revenue: {formatCurrency(d?.revenue)}</p>
                        <p className="tabular-nums text-emerald-500">Net Profit: {d?.netProfit != null ? formatCurrency(d.netProfit) : "—"}</p>
                        {d?.marginPct != null && <p className="tabular-nums text-emerald-500">Margin: {formatPercent(d.marginPct)}</p>}
                      </div>
                    );
                  }} />
                  <Bar yAxisId="left" dataKey="revenue" fill={channelColor} fillOpacity={0.3} name="Revenue" />
                  <Bar yAxisId="left" dataKey="netProfit" fill="#22c55e" fillOpacity={0.8} radius={[2, 2, 0, 0]} name="Net Profit" />
                  <Line yAxisId="right" type="monotone" dataKey="marginPct" stroke="#22c55e" strokeWidth={2} dot={false} name="Margin %" connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
