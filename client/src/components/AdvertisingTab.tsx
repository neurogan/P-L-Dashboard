import { useMemo, useState, useCallback } from "react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Target,
  MousePointerClick,
  Eye,
  TrendingUp,
  CreditCard,
  ShoppingCart,
  Info,
} from "lucide-react";
import { useAdvertising } from "@/lib/api";
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatNumber,
  formatPercent,
} from "@/lib/data";

interface Props {
  dateRange: { start: string; end: string };
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
  return dir === "asc" ? (
    <ArrowUp className="w-3 h-3 ml-1" />
  ) : (
    <ArrowDown className="w-3 h-3 ml-1" />
  );
}

function truncate(str: string, len: number) {
  if (str.length <= len) return str;
  return str.slice(0, len) + "\u2026";
}

function acosColor(acos: number): string {
  if (acos < 0.2) return "text-emerald-600 dark:text-emerald-400";
  if (acos <= 0.35) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function AcosBadge({ acos }: { acos: number }) {
  const pct = (acos * 100).toFixed(1) + "%";
  if (acos < 0.2) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-4 px-1 text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700"
      >
        {pct}
      </Badge>
    );
  }
  if (acos <= 0.35) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-4 px-1 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
      >
        {pct}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[10px] h-4 px-1 text-red-500 border-red-300 dark:text-red-400 dark:border-red-700"
    >
      {pct}
    </Badge>
  );
}

const PIE_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(43, 74%, 49%)",
  "hsl(262, 83%, 58%)",
  "hsl(0, 84%, 60%)",
  "hsl(180, 65%, 45%)",
  "hsl(320, 70%, 50%)",
  "hsl(30, 80%, 55%)",
  "hsl(100, 60%, 40%)",
  "hsl(200, 70%, 50%)",
  "hsl(270, 50%, 60%)",
];

const adColumns = [
  { key: "productTitle", label: "Product", align: "left" as const },
  { key: "spend", label: "Ad Spend", align: "right" as const },
  { key: "adSales", label: "Ad Sales", align: "right" as const },
  { key: "acos", label: "ACOS", align: "right" as const },
  { key: "tacos", label: "TACOS", align: "right" as const },
  { key: "impressions", label: "Impressions", align: "right" as const },
  { key: "clicks", label: "Clicks", align: "right" as const },
  { key: "ctr", label: "CTR", align: "right" as const },
  { key: "cpc", label: "CPC", align: "right" as const },
  { key: "orders", label: "Ad Orders", align: "right" as const },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-4" data-testid="advertising-tab-loading">
      {/* KPI skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3.5 w-3.5 rounded" />
              </div>
              <Skeleton className="h-5 w-20 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <Skeleton className="w-full h-[260px]" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table skeleton */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Pie chart skeleton */}
        <div>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <Skeleton className="h-4 w-44" />
            </CardHeader>
            <CardContent className="px-2 pb-3 flex items-center justify-center">
              <Skeleton className="w-[200px] h-[200px] rounded-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AdvertisingTab({ dateRange }: Props) {
  const [sortKey, setSortKey] = useState("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: adData, isLoading } = useAdvertising(dateRange.start, dateRange.end);

  // Transform weekly data: API returns `week` (e.g. "2026-01-19"), add `weekLabel` for chart display
  const weeklyChartData = useMemo(() => {
    if (!adData?.weeklyData) return [];
    return adData.weeklyData.map((w) => ({
      ...w,
      weekLabel: new Date(w.week + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [adData?.weeklyData]);

  const sortedAsins = useMemo(() => {
    if (!adData?.asinBreakdown) return [];
    return [...adData.asinBreakdown].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? 0;
      const bVal = (b as any)[sortKey] ?? 0;
      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [adData?.asinBreakdown, sortKey, sortDir]);

  const handleSort = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey]
  );

  // Pie chart data: top 10 by spend, rest as "Other"
  const pieData = useMemo(() => {
    if (!adData?.asinBreakdown) return [];
    const sorted = [...adData.asinBreakdown].sort(
      (a, b) => b.spend - a.spend
    );
    const top10 = sorted.slice(0, 10);
    const rest = sorted.slice(10);
    const items = top10.map((a) => ({
      name: truncate(a.productTitle, 30),
      value: a.spend,
    }));
    if (rest.length > 0) {
      items.push({
        name: "Other",
        value: rest.reduce((s, a) => s + a.spend, 0),
      });
    }
    return items;
  }, [adData?.asinBreakdown]);

  // Totals for the table
  const tableTotals = useMemo(() => {
    if (!adData?.asinBreakdown) {
      return { spend: 0, adSales: 0, impressions: 0, clicks: 0, orders: 0, totalRevenue: 0, acos: 0, tacos: 0, ctr: 0, cpc: 0 };
    }
    const t = adData.asinBreakdown.reduce(
      (acc, a) => ({
        spend: acc.spend + a.spend,
        adSales: acc.adSales + a.adSales,
        impressions: acc.impressions + a.impressions,
        clicks: acc.clicks + a.clicks,
        orders: acc.orders + a.orders,
        totalRevenue: acc.totalRevenue + a.totalRevenue,
      }),
      { spend: 0, adSales: 0, impressions: 0, clicks: 0, orders: 0, totalRevenue: 0 }
    );
    return {
      ...t,
      acos: t.adSales > 0 ? t.spend / t.adSales : 0,
      tacos: t.totalRevenue > 0 ? t.spend / t.totalRevenue : 0,
      ctr: t.impressions > 0 ? t.clicks / t.impressions : 0,
      cpc: t.clicks > 0 ? t.spend / t.clicks : 0,
    };
  }, [adData?.asinBreakdown]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Empty state
  if (!adData?.hasData) {
    return (
      <Card
        className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30"
        data-testid="ad-empty-state"
      >
        <CardContent className="p-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              No Ad Data for Selected Period
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Advertising data is available from January 20, 2026 onward. Select
              a date range within that period to view ad performance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="advertising-tab">
      {/* Section A: KPI Summary */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3"
        data-testid="ad-kpi-cards"
      >
        {[
          {
            label: "Total Ad Spend",
            value: formatCurrency(adData.totalSpend),
            icon: CreditCard,
            testId: "ad-kpi-spend",
          },
          {
            label: "Ad Sales",
            value: formatCurrency(adData.totalAdSales),
            icon: DollarSign,
            testId: "ad-kpi-sales",
          },
          {
            label: "ACOS",
            value: formatPercent(adData.acos),
            icon: Target,
            testId: "ad-kpi-acos",
            colorClass: acosColor(adData.acos),
          },
          {
            label: "Total Clicks",
            value: formatNumber(adData.totalClicks),
            icon: MousePointerClick,
            testId: "ad-kpi-clicks",
          },
          {
            label: "Impressions",
            value: formatNumber(adData.totalImpressions),
            icon: Eye,
            testId: "ad-kpi-impressions",
          },
          {
            label: "CTR",
            value: formatPercent(adData.ctr),
            icon: TrendingUp,
            testId: "ad-kpi-ctr",
          },
          {
            label: "CPC",
            value: formatCurrencyPrecise(adData.cpc),
            icon: ShoppingCart,
            testId: "ad-kpi-cpc",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.testId} data-testid={card.testId}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                    {card.label}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
                <div
                  className={`text-base font-semibold tabular-nums tracking-tight ${
                    card.colorClass || ""
                  }`}
                >
                  {card.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Section B: Weekly Ad Spend Trend */}
      <Card data-testid="ad-trend-chart-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Weekly Ad Spend & ACOS
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={weeklyChartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="weekLabel"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickFormatter={(v) => formatCurrency(v, true)}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                tickLine={false}
                axisLine={false}
                width={50}
                domain={[0, "auto"]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                      <p className="font-medium mb-1 text-foreground">
                        {label}
                      </p>
                      {payload.map((p: any) => (
                        <p
                          key={p.dataKey}
                          className="tabular-nums"
                          style={{ color: p.color }}
                        >
                          {p.dataKey === "spend" ? "Ad Spend" : "ACOS"}:{" "}
                          {p.dataKey === "spend"
                            ? formatCurrency(p.value)
                            : formatPercent(p.value)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                height={28}
                iconType="plainline"
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">
                    {value === "spend" ? "Ad Spend" : "ACOS"}
                  </span>
                )}
              />
              <Bar
                yAxisId="left"
                dataKey="spend"
                fill="hsl(221, 83%, 53%)"
                fillOpacity={0.85}
                radius={[2, 2, 0, 0]}
                name="spend"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="acos"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(0, 84%, 60%)" }}
                name="acos"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Section C: ASIN-Level Table */}
        <div className="lg:col-span-2">
          <Card data-testid="ad-asin-table-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ASIN-Level Ad Performance —{" "}
                {adData.asinBreakdown.length} Products
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {adColumns.map((col) => (
                        <TableHead
                          key={col.key}
                          className={`text-xs font-medium cursor-pointer select-none whitespace-nowrap ${
                            col.align === "right" ? "text-right" : ""
                          } ${
                            col.key === "productTitle"
                              ? "pl-4 min-w-[200px]"
                              : "px-2"
                          }`}
                          onClick={() => handleSort(col.key)}
                          data-testid={`ad-sort-${col.key}`}
                        >
                          <div
                            className={`flex items-center ${
                              col.align === "right" ? "justify-end" : ""
                            }`}
                          >
                            {col.label}
                            <SortIcon
                              active={sortKey === col.key}
                              dir={sortDir}
                            />
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Total row */}
                    <TableRow
                      className="bg-primary/5 dark:bg-primary/10 font-semibold hover:bg-primary/10 border-b-2"
                      data-testid="ad-row-total"
                    >
                      <TableCell className="pl-4 text-xs">
                        All Products
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums px-2">
                        {formatCurrency(tableTotals.spend)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums px-2">
                        {formatCurrency(tableTotals.adSales)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums px-2">
                        <AcosBadge acos={tableTotals.acos} />
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums px-2">
                        {formatPercent(tableTotals.tacos)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums px-2">
                        {formatNumber(tableTotals.impressions)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums px-2">
                        {formatNumber(tableTotals.clicks)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums px-2">
                        {formatPercent(tableTotals.ctr)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums px-2">
                        {formatCurrencyPrecise(tableTotals.cpc)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums px-2">
                        {formatNumber(tableTotals.orders)}
                      </TableCell>
                    </TableRow>

                    {sortedAsins.map((asin) => (
                      <TableRow
                        key={asin.asin}
                        data-testid={`ad-row-${asin.asin}`}
                      >
                        <TableCell className="pl-4 max-w-[250px]">
                          <div className="text-xs font-medium leading-tight">
                            {truncate(asin.productTitle, 50)}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {asin.sku}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2">
                          {formatCurrency(asin.spend)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2">
                          {formatCurrency(asin.adSales)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2">
                          <AcosBadge acos={asin.acos} />
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2">
                          {formatPercent(asin.tacos)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2">
                          {formatNumber(asin.impressions)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2">
                          {formatNumber(asin.clicks)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2">
                          {formatPercent(asin.ctr)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2">
                          {formatCurrencyPrecise(asin.cpc)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums px-2">
                          {formatNumber(asin.orders)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section D: Budget Allocation Pie */}
        <div>
          <Card data-testid="ad-budget-chart-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Budget Allocation by ASIN
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      percent > 0.05
                        ? `${name} (${(percent * 100).toFixed(0)}%)`
                        : ""
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                          <p className="font-medium text-foreground">
                            {d.name}
                          </p>
                          <p className="tabular-nums text-muted-foreground">
                            {formatCurrency(d.value as number)}
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
