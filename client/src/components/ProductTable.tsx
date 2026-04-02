import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, ChevronRight, ChevronDown, Columns3, Link2 } from "lucide-react";
import {
  ProductAggregate, formatCurrency, formatNumber, formatPercent,
  getProductColor, detectPreset, DatePreset,
} from "@/lib/data";

interface Props {
  products: ProductAggregate[];
  totals: ProductAggregate;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  selectedAsin: string | null;
  onSelectProduct: (asin: string | null) => void;
  chartSelectedAsins: string[];
  onToggleChartAsin: (asin: string) => void;
  dateRange: { start: string; end: string };
  minDate: string;
  maxDate: string;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
}

function truncate(str: string, len: number) {
  if (str.length <= len) return str;
  return str.slice(0, len) + "\u2026";
}

function FeeSourceIndicator({ feeSource }: { feeSource: string | null }) {
  if (feeSource === "estimated" || feeSource === "mixed") {
    return <span className="text-amber-500 dark:text-amber-400 text-[10px] ml-0.5" title="Includes estimated fees">~</span>;
  }
  return null;
}

// All available columns
const ALL_COLUMNS = [
  { key: "productTitle", label: "Product", align: "left" as const },
  { key: "revenue", label: "Revenue", align: "right" as const },
  { key: "totalAmazonFees", label: "Amazon Fees", align: "right" as const },
  { key: "netProceeds", label: "Net Proceeds", align: "right" as const },
  { key: "totalCogs", label: "COGS", align: "right" as const },
  { key: "adSpend", label: "Ad Spend", align: "right" as const },
  { key: "tacos", label: "TACOS", align: "right" as const },
  { key: "netProfit", label: "Net Profit", align: "right" as const },
  { key: "marginPct", label: "Margin %", align: "right" as const },
  { key: "unitsSold", label: "Units", align: "right" as const },
  { key: "acos", label: "ACOS", align: "right" as const },
  { key: "avgPrice", label: "Avg Price", align: "right" as const },
  { key: "orderCount", label: "Orders", align: "right" as const },
  { key: "refundAmount", label: "Refunds", align: "right" as const },
];

const DEFAULT_ON = ["productTitle", "revenue", "adSpend", "tacos", "netProfit", "marginPct", "unitsSold"];

function renderCellValue(product: ProductAggregate, key: string) {
  switch (key) {
    case "revenue": return formatCurrency(product.revenue);
    case "totalAmazonFees": return <>{formatCurrency(product.totalAmazonFees)}<FeeSourceIndicator feeSource={product.feeSource} /></>;
    case "netProceeds": return <>{formatCurrency(product.netProceeds)}<FeeSourceIndicator feeSource={product.feeSource} /></>;
    case "totalCogs": return product.totalCogs != null ? formatCurrency(product.totalCogs) : "\u2014";
    case "adSpend": return product.adSpend != null ? formatCurrency(product.adSpend) : "\u2014";
    case "tacos": return product.tacos != null ? formatPercent(product.tacos) : "\u2014";
    case "acos": return product.acos != null ? formatPercent(product.acos) : "\u2014";
    case "netProfit": return product.netProfit != null ? formatCurrency(product.netProfit) : "\u2014";
    case "marginPct": return product.marginPct != null ? formatPercent(product.marginPct) : "\u2014";
    case "unitsSold": return formatNumber(product.unitsSold);
    case "avgPrice": return formatCurrency(product.avgPrice);
    case "orderCount": return formatNumber(product.orderCount);
    case "refundAmount": return product.refundAmount != null ? formatCurrency(product.refundAmount) : "\u2014";
    default: return "\u2014";
  }
}

function getCellClassName(product: ProductAggregate, key: string): string {
  if (key === "netProfit") {
    return product.netProfit != null
      ? product.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-500 font-medium"
      : "text-muted-foreground";
  }
  if (key === "marginPct") {
    return product.marginPct != null
      ? product.marginPct >= 0.2 ? "text-emerald-600 dark:text-emerald-400" : product.marginPct < 0 ? "text-red-500" : ""
      : "text-muted-foreground";
  }
  return "";
}

// Expanded row component (Feature 4)
// Reads expanded metrics directly from the ProductAggregate object
function ExpandedMetrics({ product, preset }: { product: ProductAggregate; preset: DatePreset }) {
  const b2bPctOfTotal = product.b2bRevenue != null && product.revenue > 0
    ? product.b2bRevenue / product.revenue
    : null;
  const b2cPctOfTotal = product.b2cRevenue != null && product.revenue > 0
    ? product.b2cRevenue / product.revenue
    : null;

  interface MetricCard {
    label: string;
    value: string;
    change: number | null;
    sub?: string;
    placeholder?: string;
  }

  const cards: MetricCard[] = [
    {
      label: "Avg Units per Order",
      value: product.avgUnitsPerOrder != null ? product.avgUnitsPerOrder.toFixed(2) : "\u2014",
      change: null,
    },
    {
      label: "Revenue per Order",
      value: product.revenuePerOrder != null ? formatCurrency(product.revenuePerOrder) : "\u2014",
      change: null,
    },
    {
      label: "Refund Rate",
      value: product.refundRate != null ? `${(product.refundRate * 100).toFixed(1)}%` : "\u2014",
      change: null,
    },
    {
      label: "B2B Revenue",
      value: product.b2bRevenue != null ? formatCurrency(product.b2bRevenue) : "\u2014",
      sub: b2bPctOfTotal != null ? `${(b2bPctOfTotal * 100).toFixed(1)}% of total` : undefined,
      change: null,
    },
    {
      label: "B2C Revenue",
      value: product.b2cRevenue != null ? formatCurrency(product.b2cRevenue) : "\u2014",
      sub: b2cPctOfTotal != null ? `${(b2cPctOfTotal * 100).toFixed(1)}% of total` : undefined,
      change: null,
    },
    {
      label: "B2B Units",
      value: product.b2bUnits != null ? formatNumber(product.b2bUnits) : "\u2014",
      change: null,
    },
    { label: "Sessions", value: "", change: null, placeholder: "Connect Business Report" },
    { label: "Conversion Rate", value: "", change: null, placeholder: "Connect Business Report" },
    { label: "Active Subscriptions", value: "", change: null, placeholder: "Connect S&S Data" },
  ];

  return (
    <div className="px-4 py-3 grid grid-cols-3 gap-2" data-testid={`expanded-row-${product.asin}`}>
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-md p-2.5 text-xs ${
            card.placeholder
              ? "border border-dashed border-muted-foreground/30 bg-muted/20"
              : "border border-border bg-card"
          }`}
        >
          <p className="text-[10px] text-muted-foreground mb-0.5">{card.label}</p>
          {card.placeholder ? (
            <div className="flex items-center gap-1 text-muted-foreground/50">
              <Link2 className="w-3 h-3" />
              <span className="text-[10px]">{card.placeholder}</span>
            </div>
          ) : (
            <>
              <p className="font-semibold tabular-nums">{card.value}</p>
              {card.sub && <p className="text-[9px] text-muted-foreground">{card.sub}</p>}
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

export function ProductTable({
  products, totals, sortKey, sortDir, onSort,
  selectedAsin, onSelectProduct, chartSelectedAsins, onToggleChartAsin, dateRange,
  minDate, maxDate,
}: Props) {
  const maxSelected = 5;
  const isMaxed = chartSelectedAsins.length >= maxSelected;

  // Column toggle state (Feature 3)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(DEFAULT_ON));
  const [expandedAsins, setExpandedAsins] = useState<Set<string>>(new Set());

  const toggleColumn = (key: string) => {
    if (key === "productTitle") return; // Always visible
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpanded = (asin: string) => {
    setExpandedAsins((prev) => {
      const next = new Set(prev);
      if (next.has(asin)) next.delete(asin);
      else next.add(asin);
      return next;
    });
  };

  const activeColumns = ALL_COLUMNS.filter((c) => visibleColumns.has(c.key));

  // Product list for color mapping (derived from products prop)
  const productColorList = useMemo(() => products.map((p) => ({ asin: p.asin })), [products]);

  // Detect the current date preset for expanded rows
  const preset = useMemo(() => detectPreset(dateRange, minDate, maxDate), [dateRange, minDate, maxDate]);

  return (
    <Card data-testid="product-table-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Product P&L Breakdown — {products.length} Products
          </CardTitle>
          <div className="flex items-center gap-2">
            {chartSelectedAsins.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {chartSelectedAsins.length}/{maxSelected} selected for chart
              </span>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" data-testid="column-toggle-btn">
                  <Columns3 className="w-3.5 h-3.5" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end" data-testid="column-toggle-popover">
                <p className="text-xs font-medium text-muted-foreground mb-2">Toggle columns</p>
                {ALL_COLUMNS.filter((c) => c.key !== "productTitle").map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={visibleColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      data-testid={`col-toggle-${col.key}`}
                    />
                    <span className="text-xs">{col.label}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 px-1">
                  <span className="sr-only">Expand</span>
                </TableHead>
                <TableHead className="w-10 px-2">
                  <span className="sr-only">Chart</span>
                </TableHead>
                {activeColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`text-xs font-medium cursor-pointer select-none whitespace-nowrap ${
                      col.align === "right" ? "text-right" : ""
                    } ${col.key === "productTitle" ? "pl-2 min-w-[220px]" : "px-3"}`}
                    onClick={() => onSort(col.key)}
                    data-testid={`sort-${col.key}`}
                  >
                    <div className={`flex items-center ${col.align === "right" ? "justify-end" : ""}`}>
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Totals row */}
              <TableRow className="bg-primary/5 dark:bg-primary/10 font-semibold hover:bg-primary/10 border-b-2" data-testid="row-total">
                <TableCell className="px-1" />
                <TableCell className="px-2" />
                {activeColumns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={`${col.align === "right" ? "text-right" : ""} text-xs tabular-nums ${col.key === "productTitle" ? "pl-2" : "px-3"} ${getCellClassName(totals, col.key)}`}
                  >
                    {col.key === "productTitle" ? "All Products" : renderCellValue(totals, col.key)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Product rows */}
              {products.map((product) => {
                const isChartSelected = chartSelectedAsins.includes(product.asin);
                const isDetailSelected = selectedAsin === product.asin;
                const chartColor = getProductColor(product.asin, productColorList);
                const isExpanded = expandedAsins.has(product.asin);

                return (
                  <>{/* Fragment needed for key */}
                    <TableRow
                      key={product.asin}
                      className={`cursor-pointer transition-colors ${
                        isDetailSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                      }`}
                      style={isChartSelected ? { borderLeft: `3px solid ${chartColor}` } : undefined}
                      data-testid={`row-product-${product.asin}`}
                    >
                      <TableCell className="px-1" onClick={(e) => { e.stopPropagation(); toggleExpanded(product.asin); }}>
                        <Button variant="ghost" size="icon" className="h-5 w-5" data-testid={`expand-${product.asin}`}>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </Button>
                      </TableCell>
                      <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                        {isMaxed && !isChartSelected ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Checkbox checked={false} disabled data-testid={`chart-checkbox-${product.asin}`} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Max {maxSelected} products for chart</p></TooltipContent>
                          </Tooltip>
                        ) : (
                          <Checkbox
                            checked={isChartSelected}
                            onCheckedChange={() => onToggleChartAsin(product.asin)}
                            data-testid={`chart-checkbox-${product.asin}`}
                          />
                        )}
                      </TableCell>
                      {activeColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={`${col.align === "right" ? "text-right" : ""} text-xs tabular-nums ${
                            col.key === "productTitle" ? "pl-2 max-w-[300px]" : "px-3"
                          } ${getCellClassName(product, col.key)}`}
                          onClick={() => onSelectProduct(isDetailSelected ? null : product.asin)}
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
                    {isExpanded && (
                      <TableRow key={`${product.asin}-expanded`} className="hover:bg-transparent">
                        <TableCell colSpan={activeColumns.length + 2} className="p-0 bg-muted/30">
                          <ExpandedMetrics product={product} preset={preset} />
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
  );
}
