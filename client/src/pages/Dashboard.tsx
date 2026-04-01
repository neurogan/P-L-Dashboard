import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/DashboardHeader";
import { HeroChart } from "@/components/HeroChart";
import { KpiCards } from "@/components/KpiCards";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { ProductTable } from "@/components/ProductTable";
import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";
import { OverviewTab } from "@/components/OverviewTab";
import { ChannelTab } from "@/components/ChannelTab";
import { AdvertisingTab } from "@/components/AdvertisingTab";
import { SubscribeSaveTab } from "@/components/SubscribeSaveTab";
import { ParetoTab } from "@/components/ParetoTab";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import {
  data,
  aggregateProducts,
  getTotals,
  exportProfitabilityCsv,
  exportAdCsv,
  exportOverviewCsv,
  exportShopifyCsv,
  getAdSummaryForRange,
  getUnifiedProducts,
  aggregateShopifyProducts,
} from "@/lib/data";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Date range state
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: data.dateRange.oldest,
    end: data.dateRange.newest,
  });

  // Selected product for detail drawer (Amazon tab)
  const [selectedAsin, setSelectedAsin] = useState<string | null>(null);

  // Chart-selected ASINs (max 5)
  const [chartSelectedAsins, setChartSelectedAsins] = useState<string[]>([]);

  // Sort state (Amazon tab)
  const [sortKey, setSortKey] = useState<string>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Aggregate Amazon products
  const products = useMemo(
    () => aggregateProducts(data.weeklyFacts, dateRange.start, dateRange.end),
    [dateRange]
  );

  // Sort Amazon products
  const sortedProducts = useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? -Infinity;
      const bVal = (b as any)[sortKey] ?? -Infinity;
      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [products, sortKey, sortDir]);

  const totals = useMemo(() => getTotals(products), [products]);

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

  const handleToggleChartAsin = useCallback((asin: string) => {
    setChartSelectedAsins((prev) => {
      if (prev.includes(asin)) {
        return prev.filter((a) => a !== asin);
      }
      if (prev.length >= 5) return prev;
      return [...prev, asin];
    });
  }, []);

  const handleExport = useCallback(() => {
    if (activeTab === "advertising") {
      const adData = getAdSummaryForRange(dateRange.start, dateRange.end);
      if (adData.hasData) {
        exportAdCsv(adData.asinBreakdown, "neurogan-ad-performance.csv");
      }
    } else if (activeTab === "overview") {
      const prods = getUnifiedProducts(dateRange.start, dateRange.end);
      exportOverviewCsv(prods, "neurogan-overview-export.csv");
    } else if (activeTab === "shopify") {
      const prods = aggregateShopifyProducts("shopify_dtc", dateRange.start, dateRange.end);
      exportShopifyCsv(prods, "shopify_dtc", "neurogan-shopify-export.csv");
    } else if (activeTab === "faire") {
      const prods = aggregateShopifyProducts("faire", dateRange.start, dateRange.end);
      exportShopifyCsv(prods, "faire", "neurogan-faire-export.csv");
    } else {
      exportProfitabilityCsv(sortedProducts, "neurogan-amazon-pl-export.csv");
    }
  }, [activeTab, sortedProducts, dateRange]);

  const selectedProduct = useMemo(() => {
    if (!selectedAsin) return null;
    return products.find((p) => p.asin === selectedAsin) ?? null;
  }, [selectedAsin, products]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader onExport={handleExport} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex-1 w-full">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4 flex-wrap h-auto gap-1" data-testid="tab-list">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="amazon" data-testid="tab-amazon">
              Amazon
            </TabsTrigger>
            <TabsTrigger value="shopify" data-testid="tab-shopify">
              Shopify
            </TabsTrigger>
            <TabsTrigger value="faire" data-testid="tab-faire">
              Faire/Wholesale
            </TabsTrigger>
            <TabsTrigger value="advertising" data-testid="tab-advertising">
              Advertising
            </TabsTrigger>
            <TabsTrigger value="pareto" data-testid="tab-pareto">
              Pareto Analysis
            </TabsTrigger>
            <TabsTrigger
              value="subscribe-save"
              data-testid="tab-subscribe-save"
            >
              Subscribe &amp; Save
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-4">
            <DateRangeSelector
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              minDate={data.dateRange.oldest}
              maxDate={data.dateRange.newest}
            />
            <OverviewTab dateRange={dateRange} />
          </TabsContent>

          {/* Tab 2: Amazon */}
          <TabsContent value="amazon" className="space-y-4">
            <HeroChart selectedAsins={chartSelectedAsins} />
            <KpiCards dateRange={dateRange} />
            <DateRangeSelector
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              minDate={data.dateRange.oldest}
              maxDate={data.dateRange.newest}
            />
            <ProductTable
              products={sortedProducts}
              totals={totals}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              selectedAsin={selectedAsin}
              onSelectProduct={setSelectedAsin}
              chartSelectedAsins={chartSelectedAsins}
              onToggleChartAsin={handleToggleChartAsin}
              dateRange={dateRange}
            />
            <ProductDetailDrawer
              product={selectedProduct}
              dateRange={dateRange}
              onClose={() => setSelectedAsin(null)}
              open={!!selectedProduct}
            />
          </TabsContent>

          {/* Tab 3: Shopify */}
          <TabsContent value="shopify" className="space-y-4">
            <DateRangeSelector
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              minDate={data.dateRange.oldest}
              maxDate={data.dateRange.newest}
            />
            <ChannelTab channel="shopify_dtc" dateRange={dateRange} />
          </TabsContent>

          {/* Tab 4: Faire/Wholesale */}
          <TabsContent value="faire" className="space-y-4">
            <DateRangeSelector
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              minDate={data.dateRange.oldest}
              maxDate={data.dateRange.newest}
            />
            <ChannelTab channel="faire" dateRange={dateRange} />
          </TabsContent>

          {/* Tab 5: Advertising */}
          <TabsContent value="advertising" className="space-y-4">
            <DateRangeSelector
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              minDate={data.dateRange.oldest}
              maxDate={data.dateRange.newest}
            />
            <AdvertisingTab dateRange={dateRange} />
          </TabsContent>

          {/* Tab 6: Pareto Analysis */}
          <TabsContent value="pareto" className="space-y-4">
            <DateRangeSelector
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              minDate={data.dateRange.oldest}
              maxDate={data.dateRange.newest}
            />
            <ParetoTab dateRange={dateRange} />
          </TabsContent>

          {/* Tab 7: Subscribe & Save */}
          <TabsContent value="subscribe-save">
            <SubscribeSaveTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Data Sources Footer */}
      <footer className="border-t border-border mt-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Data Sources
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80">
                <span>Amazon: {data.meta.salesDataSource}</span>
                <span>Shopify DTC: Shopify Admin API</span>
                <span>Faire: Faire Orders API</span>
                <span>{data.meta.adDataSource}</span>
                <span>{data.meta.cogsDataSource}</span>
                {data.meta.feeDataSource && <span>Fees: {data.meta.feeDataSource}</span>}
              </div>
            </div>
            <PerplexityAttribution />
          </div>
        </div>
      </footer>
    </div>
  );
}
