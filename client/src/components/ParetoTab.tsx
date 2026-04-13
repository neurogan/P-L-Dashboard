import { useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  usePareto,
  calculateGiniCoefficient,
  formatCurrency,
  formatPercent,
  formatNumber,
} from "@/lib/data";

interface Props {
  dateRange: { start: string; end: string };
}

function truncate(str: string | null | undefined, len: number) {
  if (!str) return "—";
  if (str.length <= len) return str;
  return str.slice(0, len) + "…";
}

const BRIGHT_COLOR = "#3b82f6";
const MUTED_COLOR = "#94a3b8";
const BRIGHT_PROFIT = "#22c55e";
const MUTED_PROFIT = "#6b7280";
const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#94a3b8"];

export function ParetoTab({ dateRange }: Props) {
  const { data: rawProducts = [], isLoading } = usePareto(dateRange.start, dateRange.end);

  const revenueSorted = useMemo(() => {
    const sorted = [...rawProducts].filter((p) => p.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    const total = sorted.reduce((s, p) => s + p.revenue, 0);
    let cumulative = 0;
    return sorted.map((p) => {
      cumulative += p.revenue;
      return { ...p, cumPct: total > 0 ? cumulative / total : 0 };
    });
  }, [rawProducts]);

  const revenueProducts80 = useMemo(() => {
    const idx = revenueSorted.findIndex((p) => p.cumPct >= 0.8);
    return idx >= 0 ? idx + 1 : revenueSorted.length;
  }, [revenueSorted]);

  const profitSorted = useMemo(() => {
    const withCogs = rawProducts.filter((p) => p.hasCogs && p.netProfit != null && p.netProfit > 0);
    const sorted = [...withCogs].sort((a, b) => (b.netProfit ?? 0) - (a.netProfit ?? 0));
    const total = sorted.reduce((s, p) => s + (p.netProfit ?? 0), 0);
    let cumulative = 0;
    return sorted.map((p) => {
      cumulative += p.netProfit ?? 0;
      return { ...p, cumPct: total > 0 ? cumulative / total : 0 };
    });
  }, [rawProducts]);

  const profitProducts80 = useMemo(() => {
    const idx = profitSorted.findIndex((p) => p.cumPct >= 0.8);
    return idx >= 0 ? idx + 1 : profitSorted.length;
  }, [profitSorted]);

  const totalRevenue = revenueSorted.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = profitSorted.reduce((s, p) => s + (p.netProfit ?? 0), 0);

  const giniRevenue = useMemo(
    () => calculateGiniCoefficient(revenueSorted.map((p) => p.revenue)),
    [revenueSorted]
  );

  const topProduct = revenueSorted[0];
  const topProductPct = topProduct && totalRevenue > 0 ? topProduct.revenue / totalRevenue : 0;

  const pieData = useMemo(() => {
    const top5 = revenueSorted.slice(0, 5).map((p) => ({
      name: truncate(p.productTitle, 30),
      value: p.revenue,
    }));
    const rest = revenueSorted.slice(5);
    const restValue = rest.reduce((s, p) => s + p.revenue, 0);
    if (rest.length > 0) {
      top5.push({ name: `Other (${rest.length} products)`, value: restValue });
    }
    return top5;
  }, [revenueSorted]);

  const revChartData = revenueSorted.slice(0, 30);
  const profitChartData = profitSorted.slice(0, 30);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="pareto-tab">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-[100px] animate-pulse" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pareto-tab">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="pareto-summary-cards">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Products driving 80% of revenue</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular-nums">{revenueProducts80}</span>
              <span className="text-sm text-muted-foreground">/ {revenueSorted.length}</span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(revenueProducts80 / Math.max(revenueSorted.length, 1)) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Products driving 80% of profit</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular-nums">{profitProducts80}</span>
              <span className="text-sm text-muted-foreground">/ {profitSorted.length}</span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(profitProducts80 / Math.max(profitSorted.length, 1)) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Top product</p>
            <p className="text-sm font-medium leading-tight truncate" title={topProduct?.productTitle}>
              {topProduct ? truncate(topProduct.productTitle, 40) : "—"}
            </p>
            <p className="text-lg font-semibold tabular-nums mt-1">
              {formatPercent(topProductPct)} <span className="text-xs text-muted-foreground font-normal">of total revenue</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Revenue Gini coefficient</p>
            <p className="text-xl font-semibold tabular-nums">{giniRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {giniRevenue > 0.5 ? "High concentration" : giniRevenue > 0.3 ? "Moderate concentration" : "Low concentration"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Pareto Chart */}
      <Card data-testid="pareto-revenue-chart">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Concentration</CardTitle>
          <p className="text-[10px] text-muted-foreground">{revenueProducts80} products drive 80% of revenue</p>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={revChartData} margin={{ top: 10, right: 40, left: 10, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="productTitle" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={80} tickFormatter={(v) => truncate(v, 20)} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={60} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} width={40} domain={[0, 1]} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs max-w-[280px]">
                    <p className="font-medium mb-1 text-foreground">{d?.productTitle}</p>
                    <p className="tabular-nums">Revenue: {formatCurrency(d?.revenue)}</p>
                    <p className="tabular-nums">Cumulative: {formatPercent(d?.cumPct)}</p>
                  </div>
                );
              }} />
              <ReferenceLine yAxisId="right" y={0.8} stroke="#ef4444" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: "80%", position: "right", fill: "#ef4444", fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue" radius={[2, 2, 0, 0]}>
                {revChartData.map((entry, idx) => (
                  <Cell key={idx} fill={idx < revenueProducts80 ? BRIGHT_COLOR : MUTED_COLOR} fillOpacity={idx < revenueProducts80 ? 0.85 : 0.4} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cumulative %" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profit Pareto Chart */}
      <Card data-testid="pareto-profit-chart">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Profit Concentration</CardTitle>
          <p className="text-[10px] text-muted-foreground">{profitProducts80} products drive 80% of net profit</p>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {profitSorted.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={profitChartData} margin={{ top: 10, right: 40, left: 10, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="productTitle" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={80} tickFormatter={(v) => truncate(v, 20)} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={60} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} width={40} domain={[0, 1]} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs max-w-[280px]">
                      <p className="font-medium mb-1 text-foreground">{d?.productTitle}</p>
                      <p className="tabular-nums">Net Profit: {formatCurrency(d?.netProfit)}</p>
                      <p className="tabular-nums">Cumulative: {formatPercent(d?.cumPct)}</p>
                    </div>
                  );
                }} />
                <ReferenceLine yAxisId="right" y={0.8} stroke="#ef4444" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: "80%", position: "right", fill: "#ef4444", fontSize: 10 }} />
                <Bar yAxisId="left" dataKey="netProfit" name="Net Profit" radius={[2, 2, 0, 0]}>
                  {profitChartData.map((entry, idx) => (
                    <Cell key={idx} fill={idx < profitProducts80 ? BRIGHT_PROFIT : MUTED_PROFIT} fillOpacity={idx < profitProducts80 ? 0.85 : 0.4} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cumulative %" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
              No products with COGS data have positive profit in this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Distribution Donut */}
      <Card data-testid="pareto-donut-chart">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Distribution — Top 5 Products</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center gap-6 flex-wrap">
            <ResponsiveContainer width={280} height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  dataKey="value"
                  paddingAngle={2}
                  label={({ name, percent }) => `${truncate(name, 15)} ${(percent * 100).toFixed(1)}%`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                      <p className="font-medium mb-1 text-foreground">{d?.name}</p>
                      <p className="tabular-nums">{formatCurrency(d?.value as number)}</p>
                    </div>
                  );
                }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {pieData.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-xs">{entry.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground ml-auto">
                    {formatCurrency(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
