import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp, TrendingDown, DollarSign, Package, Receipt, Wallet, PiggyBank, Percent,
} from "lucide-react";
import {
  useDynamicAmazonKpis, detectPreset,
  formatCurrency, formatNumber, formatPercent,
} from "@/lib/data";
import { useBrand } from "@/lib/brand-context";

interface Props {
  dateRange: { start: string; end: string };
  minDate: string;
  maxDate: string;
}

export function KpiCards({ dateRange, minDate, maxDate }: Props) {
  const { brandId } = useBrand();
  const preset = useMemo(
    () => detectPreset(dateRange, minDate, maxDate),
    [dateRange, minDate, maxDate]
  );

  const { data: kpis, isLoading } = useDynamicAmazonKpis(brandId, dateRange, preset);

  const hideChange = preset === "All";

  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="kpi-cards">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4 h-[88px] animate-pulse" /></Card>
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
    { label: "Margin %", value: kpis.marginPct != null ? formatPercent(kpis.marginPct) : "—", change: null, icon: Percent, testId: "kpi-margin", invertColor: false },
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
