import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  formatCurrencyPrecise, formatCurrency,
  AllProduct, CHANNEL_COLORS,
  useCogsPeriods,
} from "@/lib/data";

type ChannelKey = "amazon" | "shopify_dtc" | "faire";

interface ChannelWeekly {
  week: string;
  amazonRevenue: number;
  shopifyRevenue: number;
  faireRevenue: number;
  amazonUnits: number;
  shopifyUnits: number;
  faireUnits: number;
  amazonOrders: number;
  shopifyOrders: number;
  faireOrders: number;
  amazonFees: number | null;
  shopifyFees: number;
  faireFees: number;
  amazonCogs: number | null;
  shopifyCogs: number | null;
  faireCogs: number | null;
  amazonAdSpend: number | null;
  amazonReferralFee: number | null;
  fbaFulfillmentFee: number | null;
  promotions: number | null;
  refundAmount: number | null;
  reimbursement: number | null;
  amazonNetProfit: number | null;
  shopifyNetProfit: number | null;
  faireNetProfit: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  product: AllProduct;
  dateRange: { start: string; end: string };
  weeklyData: ChannelWeekly[];
}

interface CogsPeriod {
  asin: string;
  sku: string;
  total_cogs: number;
  product_cost: number;
  shipping_cost: number;
  tariffs: number;
  starts_date: string;
  ends_date: string;
}

function findCogsPeriod(periods: CogsPeriod[], sku: string, asin: string | null): CogsPeriod | null {
  if (!periods || periods.length === 0) return null;

  // Match by SKU first, then by ASIN
  let match = periods.find((p) => p.sku === sku);
  if (!match && asin) {
    match = periods.find((p) => p.asin === asin);
  }
  return match ?? null;
}

function fmt(val: number | null): string {
  if (val == null) return "—";
  return formatCurrencyPrecise(val);
}

function pctOfRev(val: number | null, rev: number): string {
  if (val == null || rev === 0) return "—";
  return `${((val / rev) * 100).toFixed(1)}%`;
}

function LineItem({
  label,
  value,
  pctSales,
  indent = false,
  bold = false,
  negative = false,
  highlight = false,
}: {
  label: string;
  value: string;
  pctSales?: string;
  indent?: boolean;
  bold?: boolean;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1 ${indent ? "pl-4" : ""} ${bold ? "font-semibold" : ""} ${highlight ? "bg-muted/30 -mx-2 px-2 rounded" : ""}`}>
      <span className={`text-xs ${negative ? "text-muted-foreground" : "text-foreground"}`}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className={`text-xs tabular-nums ${bold ? "font-semibold" : ""} ${highlight ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
          {value}
        </span>
        {pctSales !== undefined && (
          <span className="text-[10px] tabular-nums text-muted-foreground w-12 text-right">{pctSales}</span>
        )}
      </div>
    </div>
  );
}

export function UnitEconomicsDrawer({ open, onClose, product, dateRange, weeklyData }: Props) {
  const availableChannels = useMemo(() => {
    const chs: ChannelKey[] = [];
    if (product.channels.includes("amazon")) chs.push("amazon");
    if (product.channels.includes("shopify_dtc")) chs.push("shopify_dtc");
    if (product.channels.includes("faire")) chs.push("faire");
    return chs;
  }, [product]);

  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>(
    availableChannels.includes("amazon") ? "amazon" : availableChannels[0]
  );

  const { data: cogsPeriodsData } = useCogsPeriods(product.sku);
  const cogsPeriod = useMemo(
    () => findCogsPeriod((cogsPeriodsData as CogsPeriod[]) ?? [], product.sku, product.asin),
    [cogsPeriodsData, product],
  );

  const channelData = useMemo(() => {
    const sumN = (fn: (w: ChannelWeekly) => number) => weeklyData.reduce((s, w) => s + fn(w), 0);
    const sumNullable = (fn: (w: ChannelWeekly) => number | null) => {
      const vals = weeklyData.map(fn).filter((v) => v != null);
      return vals.length > 0 ? vals.reduce((s, v) => s + (v ?? 0), 0) : null;
    };

    if (selectedChannel === "amazon") {
      const revenue = sumN((w) => w.amazonRevenue);
      const units = sumN((w) => w.amazonUnits);
      const orders = sumN((w) => w.amazonOrders);
      const fees = sumNullable((w) => w.amazonFees);
      const cogs = sumNullable((w) => w.amazonCogs);
      const adSpend = sumNullable((w) => w.amazonAdSpend);
      const netProfit = sumNullable((w) => w.amazonNetProfit);
      const referralFee = sumNullable((w) => w.amazonReferralFee);
      const fbaFee = sumNullable((w) => w.fbaFulfillmentFee);
      const promotions = sumNullable((w) => w.promotions);
      const refundAmount = sumNullable((w) => w.refundAmount);
      const reimbursement = sumNullable((w) => w.reimbursement);

      return { revenue, units, orders, fees, cogs, adSpend, netProfit, referralFee, fbaFee, promotions, refundAmount, reimbursement };
    } else if (selectedChannel === "shopify_dtc") {
      const revenue = sumN((w) => w.shopifyRevenue);
      const units = sumN((w) => w.shopifyUnits);
      const orders = sumN((w) => w.shopifyOrders);
      const fees = sumN((w) => w.shopifyFees);
      const cogs = sumNullable((w) => w.shopifyCogs);

      return { revenue, units, orders, fees: fees > 0 ? fees : null, cogs, adSpend: null, netProfit: sumNullable((w) => w.shopifyNetProfit), referralFee: null, fbaFee: null, promotions: null, refundAmount: null, reimbursement: null };
    } else {
      const revenue = sumN((w) => w.faireRevenue);
      const units = sumN((w) => w.faireUnits);
      const orders = sumN((w) => w.faireOrders);
      const fees = sumN((w) => w.faireFees);
      const cogs = sumNullable((w) => w.faireCogs);

      return { revenue, units, orders, fees: fees > 0 ? fees : null, cogs, adSpend: null, netProfit: sumNullable((w) => w.faireNetProfit), referralFee: null, fbaFee: null, promotions: null, refundAmount: null, reimbursement: null };
    }
  }, [weeklyData, selectedChannel]);

  const unitEcon = useMemo(() => {
    const { revenue, units, fees, cogs, referralFee, fbaFee } = channelData;
    if (units === 0) return null;

    const avgPrice = revenue / units;
    const cogsPerUnit = cogsPeriod ? cogsPeriod.total_cogs : (cogs != null && units > 0 ? cogs / units : null);
    const productCostPerUnit = cogsPeriod ? cogsPeriod.product_cost : cogsPerUnit;
    const shippingCostPerUnit = cogsPeriod ? cogsPeriod.shipping_cost : null;
    const tariffsPerUnit = cogsPeriod ? cogsPeriod.tariffs : null;
    const totalCogsPerUnit = cogsPerUnit;

    const grossProfit = totalCogsPerUnit != null ? avgPrice - totalCogsPerUnit : null;
    const grossMargin = grossProfit != null ? (grossProfit / avgPrice) * 100 : null;

    // Per-unit fees
    const fbaPerUnit = fbaFee != null && units > 0 ? fbaFee / units : null;
    const commissionPerUnit = referralFee != null && units > 0 ? referralFee / units : null;
    const totalFeesPerUnit = fees != null && units > 0 ? fees / units : null;

    // Amazon fees are stored as negative values; Shopify/Faire fees are positive
    // Normalize: always subtract the absolute value of fees
    // If no fees exist (e.g. Faire), net profit = gross profit
    const netProfitPerUnit = grossProfit != null
      ? grossProfit - (totalFeesPerUnit != null ? Math.abs(totalFeesPerUnit) : 0)
      : null;
    const netMargin = netProfitPerUnit != null ? (netProfitPerUnit / avgPrice) * 100 : null;
    const roi = netProfitPerUnit != null && totalCogsPerUnit != null && totalCogsPerUnit > 0
      ? (netProfitPerUnit / totalCogsPerUnit) * 100
      : null;

    return {
      avgPrice, productCostPerUnit, shippingCostPerUnit, tariffsPerUnit,
      totalCogsPerUnit, grossProfit, grossMargin,
      fbaPerUnit, commissionPerUnit, totalFeesPerUnit,
      netProfitPerUnit, netMargin, roi,
    };
  }, [channelData, cogsPeriod]);

  const channelLabels: Record<ChannelKey, string> = {
    amazon: "Amazon",
    shopify_dtc: "Shopify DTC",
    faire: "Faire",
  };

  const hasFeeData = selectedChannel === "amazon"
    ? channelData.referralFee != null || channelData.fbaFee != null
    : channelData.fees != null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-[90vw] sm:w-[60vw] lg:w-[40vw] sm:max-w-none overflow-y-auto"
        data-testid="unit-economics-drawer"
      >
        <SheetHeader className="pr-8">
          <SheetTitle className="text-base">Unit Economics</SheetTitle>
          <SheetDescription className="text-xs">
            {product.productTitle}
          </SheetDescription>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-muted-foreground font-medium">Channel:</span>
            {availableChannels.map((ch) => (
              <Button
                key={ch}
                variant={selectedChannel === ch ? "default" : "outline"}
                size="sm"
                className="h-5 text-[10px] px-2"
                style={selectedChannel === ch ? { backgroundColor: CHANNEL_COLORS[ch], borderColor: CHANNEL_COLORS[ch] } : {}}
                onClick={() => setSelectedChannel(ch)}
                data-testid={`ue-channel-${ch}`}
              >
                {channelLabels[ch]}
              </Button>
            ))}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Unit Profitability */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Unit Profitability ({channelLabels[selectedChannel]})
            </h3>

            {channelData.units === 0 ? (
              <p className="text-xs text-muted-foreground">No sales data for this product on {channelLabels[selectedChannel]} in the selected period.</p>
            ) : unitEcon ? (
              <div className="space-y-0.5">
                <LineItem label="Base Price" value={fmt(unitEcon.avgPrice)} bold />

                <LineItem label="Product Cost" value={fmt(unitEcon.productCostPerUnit != null ? -Math.abs(unitEcon.productCostPerUnit) : null)} indent negative />
                <LineItem label="Tariffs" value={fmt(unitEcon.tariffsPerUnit != null ? -Math.abs(unitEcon.tariffsPerUnit) : null)} indent negative />
                <LineItem label="Shipping Cost" value={fmt(unitEcon.shippingCostPerUnit != null ? -Math.abs(unitEcon.shippingCostPerUnit) : null)} indent negative />

                <Separator className="my-1.5" />
                <LineItem label="COGS" value={fmt(unitEcon.totalCogsPerUnit != null ? -Math.abs(unitEcon.totalCogsPerUnit) : null)} bold />
                <LineItem
                  label="Gross Profit"
                  value={fmt(unitEcon.grossProfit)}
                  pctSales={unitEcon.grossMargin != null ? `${unitEcon.grossMargin.toFixed(1)}%` : "—"}
                  bold
                  highlight
                />

                <Separator className="my-1.5" />

                {selectedChannel === "amazon" ? (
                  <>
                    <LineItem label="FBA Per Unit Fulfillment" value={fmt(unitEcon.fbaPerUnit)} indent negative />
                    <LineItem label="Commission (Referral)" value={fmt(unitEcon.commissionPerUnit)} indent negative />
                    <LineItem label="Amazon Fees" value={fmt(unitEcon.totalFeesPerUnit)} bold />
                    {!hasFeeData && (
                      <p className="text-[10px] text-muted-foreground italic pl-4">Settlement data not available for this period.</p>
                    )}
                  </>
                ) : selectedChannel === "shopify_dtc" ? (
                  <>
                    <LineItem label="Shopify Payments Fees (2.9% + $0.30)" value={fmt(unitEcon.totalFeesPerUnit != null ? -Math.abs(unitEcon.totalFeesPerUnit) : null)} indent negative />
                    <LineItem label="Shopify Fees" value={fmt(unitEcon.totalFeesPerUnit != null ? -Math.abs(unitEcon.totalFeesPerUnit) : null)} bold />
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">No platform fees (Faire handles payment)</p>
                )}

                <Separator className="my-1.5" />
                <LineItem
                  label="Net Profit (per unit)"
                  value={fmt(unitEcon.netProfitPerUnit)}
                  pctSales={unitEcon.netMargin != null ? `${unitEcon.netMargin.toFixed(1)}%` : "—"}
                  bold
                  highlight
                />
                <LineItem
                  label="ROI"
                  value={unitEcon.roi != null ? `${unitEcon.roi.toFixed(0)}%` : "—"}
                  pctSales={"(net / cogs)"}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Insufficient data to calculate unit economics.</p>
            )}
          </div>

          <Separator />

          {/* Period Total */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Period Total ({channelLabels[selectedChannel]})
            </h3>

            {channelData.revenue === 0 ? (
              <p className="text-xs text-muted-foreground">No sales data for this period.</p>
            ) : (
              <div className="space-y-0.5">
                <LineItem label="Gross Revenue" value={fmt(channelData.revenue)} pctSales="100.0%" bold />

                {channelData.cogs != null && (
                  <>
                    {cogsPeriod ? (
                      <>
                        <LineItem label="Product Cost" value={fmt(channelData.units > 0 ? -(cogsPeriod.product_cost * channelData.units) : null)} pctSales={pctOfRev(channelData.units > 0 ? -(cogsPeriod.product_cost * channelData.units) : null, channelData.revenue)} indent negative />
                        <LineItem label="Tariffs" value={fmt(cogsPeriod.tariffs > 0 ? -(cogsPeriod.tariffs * channelData.units) : 0)} pctSales={pctOfRev(cogsPeriod.tariffs > 0 ? -(cogsPeriod.tariffs * channelData.units) : 0, channelData.revenue)} indent negative />
                        <LineItem label="Shipping Cost" value={fmt(cogsPeriod.shipping_cost > 0 ? -(cogsPeriod.shipping_cost * channelData.units) : 0)} pctSales={pctOfRev(cogsPeriod.shipping_cost > 0 ? -(cogsPeriod.shipping_cost * channelData.units) : 0, channelData.revenue)} indent negative />
                      </>
                    ) : null}
                    <LineItem label="COGS" value={fmt(-Math.abs(channelData.cogs))} pctSales={pctOfRev(-Math.abs(channelData.cogs), channelData.revenue)} bold />
                  </>
                )}

                {channelData.cogs == null && (
                  <LineItem label="COGS" value="—" pctSales="—" />
                )}

                <LineItem
                  label="Gross Profit"
                  value={channelData.cogs != null ? fmt(channelData.revenue - Math.abs(channelData.cogs)) : "—"}
                  pctSales={channelData.cogs != null ? pctOfRev(channelData.revenue - Math.abs(channelData.cogs), channelData.revenue) : "—"}
                  bold
                  highlight
                />

                <Separator className="my-1.5" />

                {selectedChannel === "amazon" ? (
                  <>
                    <LineItem label="FBA Per Unit Fulfillment" value={fmt(channelData.fbaFee)} pctSales={pctOfRev(channelData.fbaFee, channelData.revenue)} indent negative />
                    <LineItem label="Commission" value={fmt(channelData.referralFee)} pctSales={pctOfRev(channelData.referralFee, channelData.revenue)} indent negative />
                    <LineItem label="Amazon Fees" value={fmt(channelData.fees)} pctSales={pctOfRev(channelData.fees, channelData.revenue)} bold />
                  </>
                ) : selectedChannel === "shopify_dtc" ? (
                  <>
                    <LineItem label="Shopify Payments Fees (2.9% + $0.30)" value={fmt(channelData.fees != null ? -Math.abs(channelData.fees) : null)} pctSales={pctOfRev(channelData.fees != null ? -Math.abs(channelData.fees) : null, channelData.revenue)} indent negative />
                    <LineItem label="Shopify Fees" value={fmt(channelData.fees != null ? -Math.abs(channelData.fees) : null)} pctSales={pctOfRev(channelData.fees != null ? -Math.abs(channelData.fees) : null, channelData.revenue)} bold />
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic my-1">No platform fees (Faire handles payment)</p>
                )}

                <Separator className="my-1.5" />

                <LineItem
                  label="Net Profit (before overhead)"
                  value={fmt(channelData.netProfit)}
                  pctSales={pctOfRev(channelData.netProfit, channelData.revenue)}
                  bold
                  highlight
                />

                {selectedChannel === "amazon" && (
                  <>
                    <Separator className="my-1.5" />
                    <div className="space-y-0.5">
                      <LineItem label="Refunds" value={fmt(channelData.refundAmount)} pctSales={pctOfRev(channelData.refundAmount, channelData.revenue)} indent negative />
                      <LineItem label="Reimbursements" value={fmt(channelData.reimbursement)} pctSales="—" indent />
                      <LineItem label="Promo Value" value={fmt(channelData.promotions)} pctSales="—" indent negative />
                      <LineItem label="PPC Costs" value={fmt(channelData.adSpend != null ? -Math.abs(channelData.adSpend) : null)} pctSales={pctOfRev(channelData.adSpend != null ? -Math.abs(channelData.adSpend) : null, channelData.revenue)} indent negative />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer notes */}
          <div className="pb-4">
            <p className="text-[10px] text-muted-foreground">
              Net Profit = Revenue − COGS − Fees − Ad Spend. Does not include overhead (rent, payroll, etc.).
            </p>
            {!hasFeeData && selectedChannel === "amazon" && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Note: Settlement fee data may not cover the entire selected period.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
