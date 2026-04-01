import { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Info } from "lucide-react";
import {
  ProductAggregate,
  getProductWeeklyData,
  getProductMonthlyData,
  formatCurrency,
  formatPercent,
  formatWeekLabel,
  WeeklyFact,
  MonthlyProductData,
} from "@/lib/data";

interface Props {
  product: ProductAggregate;
  dateRange: { start: string; end: string };
  onClose: () => void;
}

type Granularity = "daily" | "weekly" | "monthly";

function FeeIndicator({ feeSource }: { feeSource: string | null }) {
  if (feeSource === "settlement") return <span className="text-emerald-500" title="Real settlement data">●</span>;
  if (feeSource === "estimated") return <span className="text-amber-500" title="Estimated fees">~</span>;
  if (feeSource === "mixed") return <span className="text-amber-500" title="Mixed (some estimated)">~</span>;
  return null;
}

// Colors following the Quartile-style design
const COLORS = {
  adSales: "#7c3aed",    // purple
  organic: "#3b82f6",     // blue
  totalSales: "#3b82f6",  // blue
  adSpend: "#ec4899",     // pink
  revenue: "#3b82f6",     // blue
  fees: "#ef4444",        // red
  cogs: "#f97316",        // orange
  netProfit: "#22c55e",   // green
  tacos: "#f59e0b",       // amber
  acos: "#ef4444",        // red
  margin: "#22c55e",      // green
};

export function ProductDetail({ product, dateRange, onClose }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("weekly");

  const weeklyData = useMemo(
    () => getProductWeeklyData(product.asin, dateRange.start, dateRange.end),
    [product.asin, dateRange]
  );

  const monthlyData = useMemo(
    () => getProductMonthlyData(product.asin, dateRange.start, dateRange.end),
    [product.asin, dateRange]
  );

  // Find first week with ad data
  const firstAdWeek = useMemo(() => {
    const w = weeklyData.find((d) => d.hasAdData);
    return w ? w.weekStartDate : null;
  }, [weeklyData]);

  // Build chart data based on granularity
  const chartRows = useMemo(() => {
    if (granularity === "monthly") {
      return monthlyData.map((m) => ({
        label: m.label,
        revenue: m.revenue,
        adSales: m.adSales,
        organicSales: m.organicSales,
        adSpend: m.adSpend,
        totalAmazonFees: m.totalAmazonFees,
        totalCogs: m.totalCogs,
        netProceeds: m.netProceeds,
        netProfit: m.netProfit,
        feeSource: m.feeSource,
        tacos: m.adSpend != null && m.revenue > 0 ? m.adSpend / m.revenue : null,
        acos: m.adSpend != null && m.adSales != null && m.adSales > 0 ? m.adSpend / m.adSales : null,
        marginPct: m.netProfit != null && m.revenue > 0 ? m.netProfit / m.revenue : null,
      }));
    }

    // Weekly
    return weeklyData.map((w: WeeklyFact) => ({
      label: formatWeekLabel(w.weekStartDate),
      revenue: w.revenue,
      adSales: w.adSales,
      organicSales: w.organicSales,
      adSpend: w.adSpend,
      totalAmazonFees: w.totalAmazonFees,
      totalCogs: w.totalCogs,
      netProceeds: w.netProceeds,
      netProfit: w.netProfit,
      feeSource: w.feeSource,
      tacos: w.adSpend != null && w.revenue > 0 ? w.adSpend / w.revenue : null,
      acos: w.adSpend != null && w.adSales != null && w.adSales > 0 ? w.adSpend / w.adSales : null,
      marginPct: w.netProfit != null && w.revenue > 0 ? w.netProfit / w.revenue : null,
    }));
  }, [weeklyData, monthlyData, granularity]);

  const hasAnyAdData = weeklyData.some((w) => w.hasAdData);

  return (
    <Card data-testid="product-detail-panel" className="border-primary/30">
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold leading-tight">
            {product.productTitle}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className="text-[10px] h-5 font-mono">
              {product.asin}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 font-mono">
              {product.sku}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={onClose}
          data-testid="btn-close-detail"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Granularity toggle */}
        <div className="flex items-center gap-1 mb-4">
          {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
            <Button
              key={g}
              variant={granularity === g ? "default" : "outline"}
              size="sm"
              className="h-6 text-[10px] px-2.5"
              onClick={() => setGranularity(g)}
              disabled={g === "daily"}
              data-testid={`granularity-${g}`}
            >
              {g === "daily" ? "Daily" : g === "weekly" ? "Weekly" : "Monthly"}
            </Button>
          ))}
          {granularity === "daily" && (
            <span className="text-[10px] text-muted-foreground ml-2">
              Daily granularity requires Business Report data integration
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart 1: Sales — Revenue Breakdown */}
          <Card className="border-border/60">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-semibold text-foreground">
                Sales
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Revenue breakdown</p>
            </CardHeader>
            <CardContent className="px-1 pb-2">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartRows} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => formatCurrency(v, true)}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    tickLine={false}
                    axisLine={false}
                    width={35}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                          <p className="font-medium mb-1 text-foreground">{label}</p>
                          <p className="tabular-nums" style={{ color: COLORS.totalSales }}>
                            Revenue: {formatCurrency(d?.revenue)}
                          </p>
                          {d?.adSales != null && (
                            <p className="tabular-nums" style={{ color: COLORS.adSales }}>
                              Ad Sales: {formatCurrency(d.adSales)}
                            </p>
                          )}
                          {d?.organicSales != null && (
                            <p className="tabular-nums" style={{ color: COLORS.organic }}>
                              Organic: {formatCurrency(d.organicSales)}
                            </p>
                          )}
                          {d?.tacos != null && (
                            <p className="tabular-nums" style={{ color: COLORS.tacos }}>
                              TACOS: {formatPercent(d.tacos)}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
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
            </CardContent>
          </Card>

          {/* Chart 2: Ad Spend | Ad Sales */}
          <Card className="border-border/60">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-semibold text-foreground">
                Ad Spend | Ad Sales
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Advertising performance</p>
            </CardHeader>
            <CardContent className="px-1 pb-2">
              {hasAnyAdData ? (
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartRows} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={30}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => formatCurrency(v, true)}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                      domain={[0, "auto"]}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                            <p className="font-medium mb-1 text-foreground">{label}</p>
                            {d?.adSales != null && (
                              <p className="tabular-nums" style={{ color: COLORS.adSales }}>
                                Ad Sales: {formatCurrency(d.adSales)}
                              </p>
                            )}
                            {d?.adSpend != null && (
                              <p className="tabular-nums" style={{ color: COLORS.adSpend }}>
                                Ad Spend: {formatCurrency(d.adSpend)}
                              </p>
                            )}
                            {d?.acos != null && (
                              <p className="tabular-nums" style={{ color: COLORS.acos }}>
                                ACOS: {formatPercent(d.acos)}
                              </p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Bar yAxisId="left" dataKey="adSales" fill={COLORS.adSales} fillOpacity={0.8} name="Ad Sales" />
                    <Bar yAxisId="left" dataKey="adSpend" fill={COLORS.adSpend} fillOpacity={0.8} name="Ad Spend" />
                    <Line yAxisId="right" type="monotone" dataKey="acos" stroke={COLORS.acos} strokeWidth={2} dot={false} name="ACOS" connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center">
                  <div className="text-center">
                    <Info className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Ad data available from{" "}
                      {firstAdWeek
                        ? new Date(firstAdWeek + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Jan 20, 2026"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart 3: Profitability */}
          <Card className="border-border/60">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-semibold text-foreground">
                Profitability
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Revenue vs Net Profit
                {product.feeSource && (
                  <span className="ml-2">
                    <FeeIndicator feeSource={product.feeSource} />
                    <span className="ml-0.5">
                      {product.feeSource === "settlement" ? "Settlement" : product.feeSource === "estimated" ? "Estimated" : "Mixed"} fees
                    </span>
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent className="px-1 pb-2">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartRows} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => formatCurrency(v, true)}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    tickLine={false}
                    axisLine={false}
                    width={35}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                          <p className="font-medium mb-1 text-foreground">
                            {label} <FeeIndicator feeSource={d?.feeSource} />
                          </p>
                          <p className="tabular-nums" style={{ color: COLORS.revenue }}>
                            Revenue: {formatCurrency(d?.revenue)}
                          </p>
                          {d?.totalAmazonFees != null && (
                            <p className="tabular-nums" style={{ color: COLORS.fees }}>
                              Amazon Fees: {formatCurrency(d.totalAmazonFees)}
                            </p>
                          )}
                          {d?.totalCogs != null && (
                            <p className="tabular-nums" style={{ color: COLORS.cogs }}>
                              COGS: {formatCurrency(d.totalCogs)}
                            </p>
                          )}
                          {d?.adSpend != null && (
                            <p className="tabular-nums" style={{ color: COLORS.adSpend }}>
                              Ad Spend: {formatCurrency(d.adSpend)}
                            </p>
                          )}
                          <p className="tabular-nums font-medium" style={{ color: COLORS.netProfit }}>
                            Net Profit: {d?.netProfit != null ? formatCurrency(d.netProfit) : "—"}
                          </p>
                          {d?.marginPct != null && (
                            <p className="tabular-nums" style={{ color: COLORS.margin }}>
                              Margin: {formatPercent(d.marginPct)}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar yAxisId="left" dataKey="revenue" fill={COLORS.revenue} fillOpacity={0.3} name="Revenue" />
                  <Bar yAxisId="left" dataKey="netProfit" fill={COLORS.netProfit} fillOpacity={0.8} name="Net Profit" radius={[2, 2, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="marginPct" stroke={COLORS.margin} strokeWidth={2} dot={false} name="Margin %" connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
