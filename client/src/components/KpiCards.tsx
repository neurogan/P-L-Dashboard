import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, DollarSign, Package, Receipt, Wallet, PiggyBank, Percent,
} from "lucide-react";
import { useProducts } from "@/lib/api";
import type { ApiProductRow } from "@/lib/api";
import {
  detectPreset, getPriorPeriod, safePctChange,
  formatCurrency, formatNumber, formatPercent,
} from "@/lib/data";

interface Props {
  dateRange: { start: string; end: string };
  minDate: string;
  maxDate: string;
}

/** Sum Amazon product rows into aggregate KPIs. */
function sumAmazonProducts(rows: ApiProductRow[]) {
  let revenue = 0;
  let totalAmazonFees: number | null = null;
  let netProceeds: number | null = null;
  let netProfit: number | null = null;
  let unitsSold = 0;

  for (const r of rows) {
    revenue += r.revenue;
    unitsSold += r.unitsSold;
    if (r.totalAmazonFees != null) totalAmazonFees = (totalAmazonFees ?? 0) + r.totalAmazonFees;
    if (r.netProceeds != null) netProceeds = (netProceeds ?? 0) + r.netProceeds;
    if (r.netProfit != null) netProfit = (netProfit ?? 0) + r.netProfit;
  }

  const marginPct = netProfit != null && revenue > 0 ? netProfit / revenue : null;
  return { revenue, totalAmazonFees, netProceeds, netProfit, unitsSold, marginPct };
}

export function KpiCards({ dateRange, minDate, maxDate }: Props) {
  const preset = useMemo(
    () => detectPreset(dateRange, minDate, maxDate),
    [dateRange, minDate, maxDate],
  );

  const prior = useMemo(() => getPriorPeriod(dateRange, preset), [dateRange, preset]);

  // Current period Amazon products
  const { data: currentProducts, isLoading: currentLoading } = useProducts(
    dateRange.start,
    dateRange.end,
    "amazon",
  );

  // Prior period Amazon products (only when comparison is relevant)
  const { data: priorProducts, isLoading: priorLoading } = useProducts(
    prior?.start,
    prior?.end,
    prior ? "amazon" : undefined,
  );

  const hideChange = preset === "All";
  const isLoading = currentLoading || (!hideChange && prior != null && priorLoading);

  const kpis = useMemo(() => {
    if (!currentProducts) return null;

    const curr = sumAmazonProducts(currentProducts);
    const prev = priorProducts ? sumAmazonProducts(priorProducts) : null;

    return {
      ...curr,
      revenueChange: prev ? safePctChange(curr.revenue, prev.revenue) : null,
      feesChange: prev ? safePctChange(curr.totalAmazonFees, prev.totalAmazonFees) : null,
      netProceedsChange: prev ? safePctChange(curr.netProceeds, prev.netProceeds) : null,
      netProfitChange: prev ? safePctChange(curr.netProfit, prev.netProfit) : null,
      unitsSoldChange: prev ? safePctChange(curr.unitsSold, prev.unitsSold) : null,
      comparisonLabel: prior?.label ?? null,
    };
  }, [currentProducts, priorProducts, prior]);

  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="kpi-cards">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Revenue", value: formatCurrency(kpis.revenue), change: kpis.revenueChange, icon: DollarSign, testId: "kpi-revenue", invertColor: false },
    { label: "Amazon Fees", value: formatCurrency(kpis.totalAmazonFees), change: kpis.feesChange, icon: Receipt, testId: "kpi-fees", invertColor: true },
    { label: "Net Proceeds", value: formatCurrency(kpis.netProceeds), change: kpis.netProceedsChange, icon: Wallet, testId: "kpi-net-proceeds", invertColor: false },
    { label: "Net Profit", value: formatCurrency(kpis.netProfit), change: kpis.netProfitChange, icon: PiggyBank, testId: "kpi-net-profit", invertColor: false },
    { label: "Units Sold", value: formatNumber(kpis.unitsSold), change: kpis.unitsSoldChange, icon: Package, testId: "kpi-units-sold", invertColor: false },
    { label: "Margin %", value: kpis.marginPct != null ? formatPercent(kpis.marginPct) : "\u2014", change: null, icon: Percent, testId: "kpi-margin", invertColor: false },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="kpi-cards">
      {cards.map((card) => {
        const isPositive = card.change != null
          ? card.invertColor ? card.change < 0 : card.change > 0
          : null;
        const changeColor = isPositive === null
          ? ""
          : isPositive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-500 dark:text-red-400";
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
                  <span className="tabular-nums font-medium">
                    {card.change >= 0 ? "+" : ""}{card.change.toFixed(1)}%
                  </span>
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
  );
}
