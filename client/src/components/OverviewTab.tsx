import { useState, useMemo, useCallback } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  TrendingUp, TrendingDown, DollarSign, Package, PiggyBank, ArrowUpDown, ArrowUp, ArrowDown, Columns3,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import {
  data, formatCurrency, formatNumber, formatPercent, formatWeekLabel,
  getDynamicOverviewKpis, detectPreset, getChannelMix, getUnifiedProducts,
  CHANNEL_COLORS, CHANNEL_BADGE_LABELS, UnifiedProductRow,
} from "@/lib/data";

interface Props {
  dateRange: { start: string; end: string };
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
}

function truncate(str: string, len: number) {
  return str.length <= len ? str : str.slice(0, len) + "…";
}

// All columns
const ALL_COLUMNS = [
  { key: "productTitle", label: "Product", align: "left" as const },
  { key: "amazonRev", label: "Amazon Rev", align: "right" as const },
  { key: "shopifyRev", label: "Shopify Rev", align: "right" as const },
  { key: "faireRev", label: "Faire Rev", align: "right" as const },
  { key: "totalRev", label: "Total Rev", align: "right" as const },
  { key: "netProfit", label: "Net Profit", align: "right" as const },
  { key: "marginPct", label: "Margin %", align: "right" as const },
  { key: "totalUnits", label: "Units", align: "right" as const },
  { key: "totalOrders", label: "Orders", align: "right" as const },
  { key: "channels", label: "Channels", align: "left" as const },
];

const DEFAULT_ON = ["productTitle", "amazonRev", "shopifyRev", "totalRev", "netProfit", "totalUnits", "channels"];

export function OverviewTab({ dateRange }: Props) {
  const [sortKey, setSortKey] = useState("totalRev");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(DEFAULT_ON));

  const preset = useMemo(
    () => detectPreset(dateRange, data.dateRange.oldest, data.dateRange.newest),
    [dateRange]
  );
  const hideChange = preset === "All";

  const heroData = useMemo(() => {
    const hero = data.unifiedHero;
    return hero.slice(-52).map((row) => ({
      week: formatWeekLabel(row.week),
      rawWeek: row.week,
      amazonRevenue: row.amazonRevenue,
      shopifyRevenue: row.shopifyRevenue,
      faireRevenue: row.faireRevenue,
      totalRevenue: row.totalRevenue,
      totalNetProfit: row.totalNetProfit,
    }));
  }, []);

  const kpis = useMemo(
    () => getDynamicOverviewKpis(dateRange, preset),
    [dateRange, preset]
  );

  const channelMix = useMemo(
    () => getChannelMix(dateRange.start, dateRange.end),
    [dateRange]
  );

  const channelMixTotal = useMemo(() => ({
    revenue: channelMix.reduce((s, c) => s + c.revenue, 0),
    orders: channelMix.reduce((s, c) => s + c.orders, 0),
    units: channelMix.reduce((s, c) => s + c.units, 0),
    netProfit: channelMix.reduce((s, c) => s + (c.netProfit ?? 0), 0),
  }), [channelMix]);

  const products = useMemo(
    () => getUnifiedProducts(dateRange.start, dateRange.end),
    [dateRange]
  );

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (sortKey === "channels") return 0;
      const aVal = (a as any)[sortKey] ?? -Infinity;
      const bVal = (b as any)[sortKey] ?? -Infinity;
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [products, sortKey, sortDir]);

  const handleSort = useCallback((key: string) => {
    if (key === "channels") return;
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }, [sortKey]);

  const toggleColumn = (key: string) => {
    if (key === "productTitle") return;
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const activeColumns = ALL_COLUMNS.filter((c) => visibleColumns.has(c.key));

  const kpiCards = [
    { label: "Total Revenue", value: formatCurrency(kpis.totalRevenue), change: kpis.totalRevenueChange, icon: DollarSign, testId: "overview-kpi-total-revenue", color: "" },
    { label: "Amazon Revenue", value: formatCurrency(kpis.amazonRevenue), change: kpis.amazonRevenueChange, icon: DollarSign, testId: "overview-kpi-amazon-revenue", color: "text-blue-600 dark:text-blue-400" },
    { label: "Shopify Revenue", value: formatCurrency(kpis.shopifyRevenue), change: kpis.shopifyRevenueChange, icon: DollarSign, testId: "overview-kpi-shopify-revenue", color: "text-green-600 dark:text-green-400" },
    { label: "Faire Revenue", value: formatCurrency(kpis.faireRevenue), change: kpis.faireRevenueChange, icon: DollarSign, testId: "overview-kpi-faire-revenue", color: "text-purple-600 dark:text-purple-400" },
    { label: "Total Net Profit", value: formatCurrency(kpis.totalNetProfit), change: kpis.totalNetProfitChange, icon: PiggyBank, testId: "overview-kpi-net-profit", color: "" },
    { label: "Total Units", value: formatNumber(kpis.totalUnits), change: kpis.totalUnitsChange, icon: Package, testId: "overview-kpi-total-units", color: "" },
  ];

  function renderCellValue(product: UnifiedProductRow, key: string) {
    switch (key) {
      case "amazonRev": return product.amazonRev > 0 ? formatCurrency(product.amazonRev) : "—";
      case "shopifyRev": return product.shopifyRev > 0 ? formatCurrency(product.shopifyRev) : "—";
      case "faireRev": return product.faireRev > 0 ? formatCurrency(product.faireRev) : "—";
      case "totalRev": return formatCurrency(product.totalRev);
      case "netProfit": return product.netProfit != null ? formatCurrency(product.netProfit) : "—";
      case "marginPct": return product.marginPct != null ? formatPercent(product.marginPct) : "—";
      case "totalUnits": return formatNumber(product.totalUnits);
      case "totalOrders": return formatNumber(product.totalOrders);
      default: return "—";
    }
  }

  return (
    <div className="space-y-4" data-testid="overview-tab">
      {/* Hero Chart */}
      <Card data-testid="overview-hero-chart">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue by Channel — Trailing 52 Weeks
            </CardTitle>
            <span className="text-[10px] text-muted-foreground/60">Net Profit = Revenue − Fees − COGS − Ad Spend</span>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={heroData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={60} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => formatCurrency(v, true)} tickLine={false} axisLine={false} width={60} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs max-w-[280px]">
                    <p className="font-medium mb-1 text-foreground">{label}</p>
                    <p className="tabular-nums" style={{ color: CHANNEL_COLORS.amazon }}>Amazon: {formatCurrency(d?.amazonRevenue)}</p>
                    <p className="tabular-nums" style={{ color: CHANNEL_COLORS.shopify_dtc }}>Shopify: {formatCurrency(d?.shopifyRevenue)}</p>
                    <p className="tabular-nums" style={{ color: CHANNEL_COLORS.faire }}>Faire: {formatCurrency(d?.faireRevenue)}</p>
                    <p className="tabular-nums font-medium text-foreground mt-1 border-t border-border pt-1">Total: {formatCurrency(d?.totalRevenue)}</p>
                    <p className="tabular-nums text-emerald-500">Net Profit: {d?.totalNetProfit != null ? formatCurrency(d.totalNetProfit) : "—"}</p>
                  </div>
                );
              }} />
              <Legend verticalAlign="top" height={28} iconType="plainline" formatter={(value: string) => {
                const labels: Record<string, string> = { amazonRevenue: "Amazon", shopifyRevenue: "Shopify DTC", faireRevenue: "Faire", totalNetProfit: "Net Profit" };
                return <span className="text-xs text-muted-foreground">{labels[value] ?? value}</span>;
              }} />
              <Bar yAxisId="left" dataKey="amazonRevenue" fill={CHANNEL_COLORS.amazon} fillOpacity={0.85} stackId="rev" name="amazonRevenue" />
              <Bar yAxisId="left" dataKey="shopifyRevenue" fill={CHANNEL_COLORS.shopify_dtc} fillOpacity={0.85} stackId="rev" name="shopifyRevenue" />
              <Bar yAxisId="left" dataKey="faireRevenue" fill={CHANNEL_COLORS.faire} fillOpacity={0.85} stackId="rev" name="faireRevenue" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="totalNetProfit" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} name="totalNetProfit" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="overview-kpi-cards">
        {kpiCards.map((card) => {
          const isPositive = card.change != null ? card.change > 0 : null;
          const changeColor = isPositive === null ? "" : isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
          const ChangeIcon = card.change != null && card.change >= 0 ? TrendingUp : TrendingDown;
          const Icon = card.icon;
          return (
            <Card key={card.testId} data-testid={card.testId} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                  <Icon className="w-4 h-4 text-muted-foreground/50" />
                </div>
                <div className={`text-lg font-semibold tabular-nums tracking-tight ${card.color}`}>{card.value}</div>
                {!hideChange && card.change != null && (
                  <div className={`flex items-center gap-1 mt-1 text-xs ${changeColor}`}>
                    <ChangeIcon className="w-3 h-3" />
                    <span className="tabular-nums font-medium">{card.change >= 0 ? "+" : ""}{card.change.toFixed(1)}%</span>
                  </div>
                )}
                {!hideChange && kpis.comparisonLabel && card.change != null && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">{kpis.comparisonLabel}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Channel Mix Table */}
      <Card data-testid="overview-channel-mix">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Channel Mix Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium pl-4">Channel</TableHead>
                  <TableHead className="text-xs font-medium text-right px-3">Revenue</TableHead>
                  <TableHead className="text-xs font-medium text-right px-3">% of Total</TableHead>
                  <TableHead className="text-xs font-medium text-right px-3">Orders</TableHead>
                  <TableHead className="text-xs font-medium text-right px-3">Units</TableHead>
                  <TableHead className="text-xs font-medium text-right px-3">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelMix.map((row) => (
                  <TableRow key={row.channel} data-testid={`channel-mix-${row.channel}`}>
                    <TableCell className="pl-4 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: (CHANNEL_COLORS as any)[row.channel] }} />
                        {row.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums px-3">{formatCurrency(row.revenue)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums px-3">{formatPercent(row.pctOfTotal)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums px-3">{formatNumber(row.orders)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums px-3">{formatNumber(row.units)}</TableCell>
                    <TableCell className={`text-right text-xs tabular-nums px-3 font-medium ${row.netProfit != null && row.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                      {formatCurrency(row.netProfit)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-primary/5 dark:bg-primary/10 font-semibold border-t-2" data-testid="channel-mix-total">
                  <TableCell className="pl-4 text-xs">Total</TableCell>
                  <TableCell className="text-right text-xs tabular-nums px-3">{formatCurrency(channelMixTotal.revenue)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums px-3">100.0%</TableCell>
                  <TableCell className="text-right text-xs tabular-nums px-3">{formatNumber(channelMixTotal.orders)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums px-3">{formatNumber(channelMixTotal.units)}</TableCell>
                  <TableCell className={`text-right text-xs tabular-nums px-3 font-medium ${channelMixTotal.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                    {formatCurrency(channelMixTotal.netProfit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Unified Product Table */}
      <Card data-testid="overview-product-table">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">All Products — {products.length} SKUs</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" data-testid="overview-column-toggle-btn">
                  <Columns3 className="w-3.5 h-3.5" />Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end" data-testid="overview-column-toggle-popover">
                <p className="text-xs font-medium text-muted-foreground mb-2">Toggle columns</p>
                {ALL_COLUMNS.filter((c) => c.key !== "productTitle").map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={visibleColumns.has(col.key)} onCheckedChange={() => toggleColumn(col.key)} data-testid={`overview-col-toggle-${col.key}`} />
                    <span className="text-xs">{col.label}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {activeColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={`text-xs font-medium ${col.key !== "channels" ? "cursor-pointer" : ""} select-none whitespace-nowrap ${col.align === "right" ? "text-right" : ""} ${col.key === "productTitle" ? "pl-4 min-w-[220px]" : "px-3"}`}
                      onClick={() => handleSort(col.key)}
                      data-testid={`overview-sort-${col.key}`}
                    >
                      <div className={`flex items-center ${col.align === "right" ? "justify-end" : ""}`}>
                        {col.label}
                        {col.key !== "channels" && <SortIcon active={sortKey === col.key} dir={sortDir} />}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((product) => (
                  <TableRow
                    key={product.sku}
                    data-testid={`overview-row-${product.sku}`}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {activeColumns.map((col) => (
                      <TableCell key={col.key} className={`${col.align === "right" ? "text-right" : ""} text-xs tabular-nums ${col.key === "productTitle" ? "pl-4 max-w-[300px]" : "px-3"} ${
                        col.key === "netProfit" ? (product.netProfit != null ? (product.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-500 font-medium") : "") :
                        col.key === "totalRev" ? "font-medium" : ""
                      }`}>
                        {col.key === "productTitle" ? (
                          <Link
                            href={`/product/${encodeURIComponent(product.sku)}`}
                            className="block group"
                            data-testid={`product-link-${product.sku}`}
                          >
                            <div className="text-xs font-medium leading-tight group-hover:text-primary transition-colors flex items-center gap-1">
                              {truncate(product.productTitle, 55)}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">{product.sku}</span>
                          </Link>
                        ) : col.key === "channels" ? (
                          <div className="flex gap-1 flex-wrap">
                            {product.channels.includes("amazon") && <Badge variant="outline" className="h-4 text-[9px] px-1 text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700">AMZ</Badge>}
                            {product.channels.includes("shopify_dtc") && <Badge variant="outline" className="h-4 text-[9px] px-1 text-green-600 border-green-300 dark:text-green-400 dark:border-green-700">SHOP</Badge>}
                            {product.channels.includes("faire") && <Badge variant="outline" className="h-4 text-[9px] px-1 text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-700">FAIRE</Badge>}
                          </div>
                        ) : renderCellValue(product, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
