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
  TrendingUp, TrendingDown, DollarSign, Package, Receipt, Wallet, PiggyBank, Percent,
  ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, ChevronRight, ChevronDown, Columns3, Link2,
} from "lucide-react";
import {
  formatCurrency, formatNumber, formatPercent, formatWeekLabel,
  useChannelHero, useDynamicChannelKpis, useShopifyProducts,
  getShopifyTotals, getShopifyExpandedMetrics, getPriorPeriod,
  detectPreset, ShopifyProductAggregate, CHANNEL_COLORS, CHANNEL_LABELS, DatePreset,
} from "@/lib/data";
import { ShopifyDetailDrawer } from "@/components/ProductDetailDrawer";
import { useBrand } from "@/lib/brand-context";

interface Props {
  channel: "shopify_dtc" | "faire";
  dateRange: { start: string; end: string };
  minDate: string;
  maxDate: string;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
}

function truncate(str: string | null | undefined, len: number) {
  if (!str) return "—";
  return str.length <= len ? str : str.slice(0, len) + "…";
}

const SHOPIFY_ALL_COLUMNS = [
  { key: "productTitle", label: "Product", align: "left" as const },
  { key: "revenue", label: "Revenue", align: "right" as const },
  { key: "paymentFees", label: "Payment Fees", align: "right" as const },
  { key: "totalCogs", label: "COGS", align: "right" as const },
  { key: "netProfit", label: "Net Profit", align: "right" as const },
  { key: "marginPct", label: "Margin %", align: "right" as const },
  { key: "unitsSold", label: "Units", align: "right" as const },
  { key: "avgPrice", label: "Avg Price", align: "right" as const },
  { key: "orderCount", label: "Orders", align: "right" as const },
];

const FAIRE_ALL_COLUMNS = [
  { key: "productTitle", label: "Product", align: "left" as const },
  { key: "revenue", label: "Revenue", align: "right" as const },
  { key: "totalCogs", label: "COGS", align: "right" as const },
  { key: "netProfit", label: "Net Profit", align: "right" as const },
  { key: "marginPct", label: "Margin %", align: "right" as const },
  { key: "unitsSold", label: "Units", align: "right" as const },
  { key: "avgPrice", label: "Avg Price", align: "right" as const },
  { key: "orderCount", label: "Orders", align: "right" as const },
];

const SHOPIFY_DEFAULT_ON = ["productTitle", "revenue", "paymentFees", "netProfit", "marginPct", "unitsSold"];
const FAIRE_DEFAULT_ON = ["productTitle", "revenue", "totalCogs", "netProfit", "marginPct", "unitsSold"];

function ShopifyExpandedRow({ sku, channel, dateRange, minDate, maxDate }: { sku: string; channel: "shopify_dtc" | "faire"; dateRange: { start: string; end: string }; minDate: string; maxDate: string }) {
  const metrics = useMemo(
    () => getShopifyExpandedMetrics(channel, sku, dateRange.start, dateRange.end),
    [sku, channel, dateRange]
  );

  const preset = detectPreset(dateRange, minDate, maxDate);
  const prior = getPriorPeriod(dateRange, preset);
  const priorMetrics = useMemo(() => {
    if (!prior) return null;
    return getShopifyExpandedMetrics(channel, sku, prior.start, prior.end);
  }, [sku, channel, prior]);

  const pctChange = (curr: number | null, prev: number | null) => {
    if (curr == null || prev == null || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const isShopify = channel === "shopify_dtc";
  const cards = [
    { label: "Avg Units per Order", value: metrics.avgUnitsPerOrder != null ? metrics.avgUnitsPerOrder.toFixed(2) : "—", change: priorMetrics ? pctChange(metrics.avgUnitsPerOrder, priorMetrics.avgUnitsPerOrder) : null },
    { label: "Revenue per Order", value: metrics.revenuePerOrder != null ? formatCurrency(metrics.revenuePerOrder) : "—", change: priorMetrics ? pctChange(metrics.revenuePerOrder, priorMetrics.revenuePerOrder) : null },
    { label: "Sessions", value: "", change: null, placeholder: isShopify ? "Connect Shopify Analytics" : "Connect Faire Analytics" },
    { label: "Conversion Rate", value: "", change: null, placeholder: isShopify ? "Connect Shopify Analytics" : "Connect Faire Analytics" },
    ...(isShopify ? [
      { label: "Avg Time on Page", value: "", change: null, placeholder: "Connect Shopify Analytics" },
      { label: "Active Subscriptions", value: "", change: null, placeholder: "Connect Subscription App" },
    ] : []),
  ];

  return (
    <div className="px-4 py-3 grid grid-cols-3 gap-2" data-testid={`expanded-row-${sku}`}>
      {cards.map((card) => (
        <div key={card.label} className={`rounded-md p-2.5 text-xs ${card.placeholder ? "border border-dashed border-muted-foreground/30 bg-muted/20" : "border border-border bg-card"}`}>
          <p className="text-[10px] text-muted-foreground mb-0.5">{card.label}</p>
          {card.placeholder ? (
            <div className="flex items-center gap-1 text-muted-foreground/50">
              <Link2 className="w-3 h-3" />
              <span className="text-[10px]">{card.placeholder}</span>
            </div>
          ) : (
            <>
              <p className="font-semibold tabular-nums">{card.value}</p>
              {card.change != null && preset !== "All" && (
                <p className={`text-[10px] tabular-nums mt-0.5 ${card.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {card.change >= 0 ? "+" : ""}{card.change.toFixed(1)}%
                </p>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function ChannelTab({ channel, dateRange, minDate, maxDate }: Props) {
  const { brandId } = useBrand();
  const [sortKey, setSortKey] = useState("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());

  const isFaire = channel === "faire";
  const allCols = isFaire ? FAIRE_ALL_COLUMNS : SHOPIFY_ALL_COLUMNS;
  const defaultOn = isFaire ? FAIRE_DEFAULT_ON : SHOPIFY_DEFAULT_ON;
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(defaultOn));

  const channelColor = CHANNEL_COLORS[channel];
  const channelLabel = CHANNEL_LABELS[channel];
  const isShopify = channel === "shopify_dtc";

  // Fetch channel hero data from API
  const { data: rawHeroData, isLoading: heroLoading } = useChannelHero(channel);
  const heroData = useMemo(() => {
    if (!rawHeroData) return [];
    return rawHeroData.slice(-52).map((row) => ({
      week: formatWeekLabel(row.week),
      rawWeek: row.week,
      revenue: row.revenue,
      netProfit: row.netProfit,
    }));
  }, [rawHeroData]);

  const preset = useMemo(
    () => detectPreset(dateRange, minDate, maxDate),
    [dateRange, minDate, maxDate]
  );

  const { data: kpis, isLoading: kpisLoading } = useDynamicChannelKpis(channel, brandId, dateRange, preset);

  const hideChange = preset === "All";

  const { data: products = [] } = useShopifyProducts(brandId, channel, dateRange.start, dateRange.end);

  const totals = useMemo(() => getShopifyTotals(products), [products]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? -Infinity;
      const bVal = (b as any)[sortKey] ?? -Infinity;
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [products, sortKey, sortDir]);

  const handleSort = useCallback((key: string) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }, [sortKey]);

  const selectedProduct = useMemo(() => {
    if (!selectedSku) return null;
    return products.find((p) => p.sku === selectedSku) ?? null;
  }, [selectedSku, products]);

  const toggleColumn = (key: string) => {
    if (key === "productTitle") return;
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleExpanded = (sku: string) => {
    setExpandedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku); else next.add(sku);
      return next;
    });
  };

  const activeColumns = allCols.filter((c) => visibleColumns.has(c.key));

  const kpiCards = kpis ? (isFaire
    ? [
        { label: "Revenue", value: formatCurrency(kpis.revenue), change: kpis.revenueChange, icon: DollarSign, testId: `${channel}-kpi-revenue` },
        { label: "COGS", value: formatCurrency(kpis.cogs), change: null, icon: Receipt, testId: `${channel}-kpi-cogs` },
        { label: "Net Profit", value: formatCurrency(kpis.netProfit), change: kpis.netProfitChange, icon: PiggyBank, testId: `${channel}-kpi-profit` },
        { label: "Units", value: formatNumber(kpis.unitsSold), change: kpis.unitsSoldChange, icon: Package, testId: `${channel}-kpi-units` },
        { label: "Avg Order Value", value: formatCurrency(kpis.avgOrderValue), change: null, icon: ShoppingCart, testId: `${channel}-kpi-aov` },
      ]
    : [
        { label: "Revenue", value: formatCurrency(kpis.revenue), change: kpis.revenueChange, icon: DollarSign, testId: `${channel}-kpi-revenue` },
        { label: "Shopify Fees", value: formatCurrency(kpis.fees), change: kpis.feesChange, icon: Receipt, testId: `${channel}-kpi-fees` },
        { label: "Net Proceeds", value: formatCurrency(kpis.netProceeds), change: kpis.netProceedsChange, icon: Wallet, testId: `${channel}-kpi-np` },
        { label: "Net Profit", value: formatCurrency(kpis.netProfit), change: kpis.netProfitChange, icon: PiggyBank, testId: `${channel}-kpi-profit` },
        { label: "Units", value: formatNumber(kpis.unitsSold), change: kpis.unitsSoldChange, icon: Package, testId: `${channel}-kpi-units` },
        { label: "Margin %", value: kpis.marginPct != null ? formatPercent(kpis.marginPct) : "—", change: null, icon: Percent, testId: `${channel}-kpi-margin` },
      ]) : [];

  function renderCellValue(product: ShopifyProductAggregate, key: string) {
    switch (key) {
      case "revenue": return formatCurrency(product.revenue);
      case "paymentFees": return formatCurrency(product.paymentFees);
      case "totalCogs": return product.totalCogs != null ? formatCurrency(product.totalCogs) : "—";
      case "netProfit": return product.netProfit != null ? formatCurrency(product.netProfit) : "—";
      case "marginPct": return product.marginPct != null ? formatPercent(product.marginPct) : "—";
      case "unitsSold": return formatNumber(product.unitsSold);
      case "avgPrice": return formatCurrency(product.avgPrice);
      case "orderCount": return formatNumber(product.orderCount);
      default: return "—";
    }
  }

  return (
    <div className="space-y-4" data-testid={`${channel}-tab`}>
      {/* Hero Chart */}
      <Card data-testid={`${channel}-hero-chart`}>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {channelLabel} Revenue vs. Net Profit — Trailing 52 Weeks
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {heroData.length > 0 ? (
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
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                      <p className="font-medium mb-1 text-foreground">{label}</p>
                      <p className="tabular-nums" style={{ color: channelColor }}>Revenue: {formatCurrency(d?.revenue)}</p>
                      <p className="tabular-nums text-emerald-500">Net Profit: {d?.netProfit != null ? formatCurrency(d.netProfit) : "—"}</p>
                    </div>
                  );
                }} />
                <Bar yAxisId="left" dataKey="revenue" fill={channelColor} fillOpacity={0.85} radius={[2, 2, 0, 0]} name="revenue" />
                <Line yAxisId="right" type="monotone" dataKey="netProfit" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} name="netProfit" connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : heroLoading ? (
            <div className="h-[320px] flex items-center justify-center">
              <span className="text-sm text-muted-foreground animate-pulse">Loading chart...</span>
            </div>
          ) : (
            <div className="h-[320px] flex items-center justify-center">
              <span className="text-sm text-muted-foreground">No data for the selected date range</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className={`grid grid-cols-2 md:grid-cols-3 ${isFaire ? "lg:grid-cols-5" : "lg:grid-cols-6"} gap-3`} data-testid={`${channel}-kpi-cards`}>
        {kpiCards.length > 0 ? kpiCards.map((card) => {
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
                <div className="text-lg font-semibold tabular-nums tracking-tight">{card.value}</div>
                {!hideChange && card.change != null && (
                  <div className={`flex items-center gap-1 mt-1 text-xs ${changeColor}`}>
                    <ChangeIcon className="w-3 h-3" />
                    <span className="tabular-nums font-medium">{card.change >= 0 ? "+" : ""}{card.change.toFixed(1)}%</span>
                  </div>
                )}
                {!hideChange && kpis?.comparisonLabel && card.change != null && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">{kpis.comparisonLabel}</p>
                )}
              </CardContent>
            </Card>
          );
        }) : Array.from({ length: isFaire ? 5 : 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4 h-[88px] animate-pulse" /></Card>
        ))}
      </div>

      {/* Product Table */}
      <Card data-testid={`${channel}-product-table`}>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {channelLabel} Products — {products.length} SKUs
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" data-testid={`${channel}-column-toggle-btn`}>
                  <Columns3 className="w-3.5 h-3.5" />Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end" data-testid={`${channel}-column-toggle-popover`}>
                <p className="text-xs font-medium text-muted-foreground mb-2">Toggle columns</p>
                {allCols.filter((c) => c.key !== "productTitle").map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={visibleColumns.has(col.key)} onCheckedChange={() => toggleColumn(col.key)} data-testid={`${channel}-col-toggle-${col.key}`} />
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
                  {isShopify && <TableHead className="w-8 px-1"><span className="sr-only">Expand</span></TableHead>}
                  {activeColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={`text-xs font-medium cursor-pointer select-none whitespace-nowrap ${col.align === "right" ? "text-right" : ""} ${col.key === "productTitle" ? "pl-4 min-w-[220px]" : "px-3"}`}
                      onClick={() => handleSort(col.key)}
                      data-testid={`${channel}-sort-${col.key}`}
                    >
                      <div className={`flex items-center ${col.align === "right" ? "justify-end" : ""}`}>
                        {col.label}<SortIcon active={sortKey === col.key} dir={sortDir} />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Totals row */}
                <TableRow className="bg-primary/5 dark:bg-primary/10 font-semibold hover:bg-primary/10 border-b-2" data-testid={`${channel}-row-total`}>
                  {isShopify && <TableCell className="px-1" />}
                  {activeColumns.map((col) => (
                    <TableCell key={col.key} className={`${col.align === "right" ? "text-right" : ""} text-xs tabular-nums ${col.key === "productTitle" ? "pl-4" : "px-3"}`}>
                      {col.key === "productTitle" ? "All Products" : renderCellValue(totals, col.key)}
                    </TableCell>
                  ))}
                </TableRow>

                {sortedProducts.map((product) => {
                  const isSelected = selectedSku === product.sku;
                  const isExpanded = expandedSkus.has(product.sku);
                  return (
                    <>
                      <TableRow
                        key={product.sku}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                        data-testid={`${channel}-row-${product.sku}`}
                      >
                        {isShopify && (
                          <TableCell className="px-1" onClick={(e) => { e.stopPropagation(); toggleExpanded(product.sku); }}>
                            <Button variant="ghost" size="icon" className="h-5 w-5" data-testid={`${channel}-expand-${product.sku}`}>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </Button>
                          </TableCell>
                        )}
                        {activeColumns.map((col) => (
                          <TableCell
                            key={col.key}
                            className={`${col.align === "right" ? "text-right" : ""} text-xs tabular-nums ${col.key === "productTitle" ? "pl-4 max-w-[300px]" : "px-3"} ${
                              col.key === "netProfit" ? (product.netProfit != null ? (product.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-500 font-medium") : "text-muted-foreground") :
                              col.key === "marginPct" ? (product.marginPct != null ? (product.marginPct >= 0.2 ? "text-emerald-600 dark:text-emerald-400" : product.marginPct < 0 ? "text-red-500" : "") : "text-muted-foreground") : ""
                            }`}
                            onClick={() => setSelectedSku(isSelected ? null : product.sku)}
                          >
                            {col.key === "productTitle" ? (
                              <>
                                <div className="text-xs font-medium leading-tight">{truncate(product.productTitle, 55)}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-muted-foreground font-mono">{product.sku}</span>
                                  {!product.hasCogs && (
                                    <Badge variant="outline" className="h-4 text-[9px] px-1 gap-0.5 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                                      <AlertTriangle className="w-2.5 h-2.5" />No COGS
                                    </Badge>
                                  )}
                                </div>
                              </>
                            ) : renderCellValue(product, col.key)}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isShopify && isExpanded && (
                        <TableRow key={`${product.sku}-expanded`} className="hover:bg-transparent">
                          <TableCell colSpan={activeColumns.length + 1} className="p-0 bg-muted/30">
                            <ShopifyExpandedRow sku={product.sku} channel={channel} dateRange={dateRange} minDate={minDate} maxDate={maxDate} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Product Detail Drawer */}
      <ShopifyDetailDrawer
        product={selectedProduct}
        channel={channel}
        dateRange={dateRange}
        onClose={() => setSelectedSku(null)}
        open={!!selectedProduct}
      />
    </div>
  );
}
