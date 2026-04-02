import { useMemo } from "react";
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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatWeekLabel, getProductColor } from "@/lib/data";
import { useHeroChart, useProductWeeklyRevenue, useProductsCatalog } from "@/lib/api";

interface Props {
  selectedAsins: string[];
}

export function HeroChart({ selectedAsins }: Props) {
  const { data: heroChartData, isLoading: heroLoading } = useHeroChart();
  const { data: catalogProducts, isLoading: catalogLoading } = useProductsCatalog();

  // Fixed 5 hook calls for per-ASIN weekly revenue (hooks can't be called conditionally)
  const asin0 = selectedAsins[0] ?? null;
  const asin1 = selectedAsins[1] ?? null;
  const asin2 = selectedAsins[2] ?? null;
  const asin3 = selectedAsins[3] ?? null;
  const asin4 = selectedAsins[4] ?? null;

  const { data: rev0 } = useProductWeeklyRevenue(asin0);
  const { data: rev1 } = useProductWeeklyRevenue(asin1);
  const { data: rev2 } = useProductWeeklyRevenue(asin2);
  const { data: rev3 } = useProductWeeklyRevenue(asin3);
  const { data: rev4 } = useProductWeeklyRevenue(asin4);

  const productRevMaps = useMemo(() => {
    const maps: Record<string, number>[] = [rev0, rev1, rev2, rev3, rev4].map(
      (r) => r ?? {},
    );
    return maps;
  }, [rev0, rev1, rev2, rev3, rev4]);

  // Build a product list for getProductColor from catalog data
  const productList = useMemo(() => {
    if (!catalogProducts) return undefined;
    return catalogProducts
      .filter((p) => p.asin != null)
      .map((p) => ({ asin: p.asin as string }));
  }, [catalogProducts]);

  const chartData = useMemo(() => {
    if (!heroChartData) return [];
    const slice = heroChartData.slice(-52);

    return slice.map((row) => {
      const entry: any = {
        week: formatWeekLabel(row.week),
        rawWeek: row.week,
        totalRevenue: row.revenue,
        netProfit: row.netProfit,
        feeSource: (row as any).feeSource,
      };

      if (selectedAsins.length > 0) {
        let selectedTotal = 0;
        for (let i = 0; i < selectedAsins.length; i++) {
          const asin = selectedAsins[i];
          const revMap = productRevMaps[i];
          const val = revMap[row.week] ?? 0;
          entry[`product_${asin}`] = val;
          selectedTotal += val;
        }
        entry.remainingRevenue = Math.max(0, row.revenue - selectedTotal);
      } else {
        entry.revenue = row.revenue;
      }

      return entry;
    });
  }, [heroChartData, selectedAsins, productRevMaps]);

  // Build product names lookup from catalog
  const productNames = useMemo(() => {
    const map = new Map<string, string>();
    if (!catalogProducts) return map;
    for (const p of catalogProducts) {
      if (p.asin) {
        map.set(p.asin, p.productTitle.length > 35 ? p.productTitle.slice(0, 35) + "\u2026" : p.productTitle);
      }
    }
    return map;
  }, [catalogProducts]);

  const hasSelectedProducts = selectedAsins.length > 0;
  const isLoading = heroLoading || catalogLoading;

  if (isLoading) {
    return (
      <Card data-testid="hero-chart-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue vs. Net Profit — Trailing 52 Weeks
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <Skeleton className="w-full h-[320px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="hero-chart-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Revenue vs. Net Profit — Trailing 52 Weeks
          </CardTitle>
          <span className="text-[10px] text-muted-foreground/60">
            Net Profit = Revenue − Amazon Fees − COGS − Ad Spend
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => formatCurrency(v, true)}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => formatCurrency(v, true)}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs max-w-[280px]">
                    <p className="font-medium mb-1 text-foreground">{label}</p>
                    <p className="tabular-nums text-blue-500">
                      Total Revenue: {formatCurrency(d?.totalRevenue)}
                    </p>
                    {hasSelectedProducts && selectedAsins.map((asin) => (
                      <p key={asin} className="tabular-nums" style={{ color: getProductColor(asin, productList) }}>
                        {productNames.get(asin) ?? asin}: {formatCurrency(d?.[`product_${asin}`])}
                      </p>
                    ))}
                    <p className="tabular-nums text-emerald-500">
                      Net Profit: {d?.netProfit != null ? formatCurrency(d.netProfit) : "\u2014"}
                      {d?.feeSource === "estimated" && <span className="ml-1 text-amber-500" title="Estimated fees">~</span>}
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="plainline"
              formatter={(value: string) => {
                if (value === "netProfit") return <span className="text-xs text-muted-foreground">Net Profit</span>;
                if (value === "revenue") return <span className="text-xs text-muted-foreground">Revenue</span>;
                if (value === "remainingRevenue") return <span className="text-xs text-muted-foreground">Other Revenue</span>;
                // Product name
                const asin = value.replace("product_", "");
                return <span className="text-xs text-muted-foreground">{productNames.get(asin) ?? asin}</span>;
              }}
            />

            {/* Bars: either single revenue or stacked */}
            {!hasSelectedProducts ? (
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="hsl(221, 83%, 53%)"
                fillOpacity={0.85}
                radius={[2, 2, 0, 0]}
                name="revenue"
                stackId="rev"
              />
            ) : (
              <>
                <Bar
                  yAxisId="left"
                  dataKey="remainingRevenue"
                  fill="hsl(221, 83%, 75%)"
                  fillOpacity={0.5}
                  name="remainingRevenue"
                  stackId="rev"
                />
                {selectedAsins.map((asin) => (
                  <Bar
                    key={asin}
                    yAxisId="left"
                    dataKey={`product_${asin}`}
                    fill={getProductColor(asin, productList)}
                    fillOpacity={0.9}
                    name={`product_${asin}`}
                    stackId="rev"
                  />
                ))}
              </>
            )}

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="netProfit"
              stroke="hsl(142, 71%, 45%)"
              strokeWidth={2}
              dot={false}
              name="netProfit"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
