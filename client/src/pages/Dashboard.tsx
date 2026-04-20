import { useBrand } from "@/lib/brand-context";
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
import { ChannelSettingsButton } from "@/components/ChannelSettings";
import { SubscribeSaveTab } from "@/components/SubscribeSaveTab";
import { ParetoTab } from "@/components/ParetoTab";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import {
  useMeta,
  useProducts,
  useAdvertising,
  useUnifiedProducts,
  useShopifyProducts,
  getTotals,
  exportProfitabilityCsv,
  exportAdCsv,
  exportOverviewCsv,
  exportShopifyCsv,
  ProductAggregate,
} from "@/lib/data";

export default function Dashboard() {
  const { brandId } = useBrand();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch metadata (date range, data sources)
  const { data: meta, isLoading: metaLoading } = useMeta();

  const minDate = meta?.["dateRange.oldest"] ?? "";
  const maxDate = meta?.["dateRange.newest"] ?? "";
  const hasData = meta?.["_empty"] !== "true";

  // Date range state — initialized to full range once meta loads
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const effectiveDateRange = dateRange ?? { start: minDate, end: maxDate };

  // If meta loaded but we haven't set the date range yet, initialize it
  if (minDate && maxDate && !dateRange) {
    setDateRange({ start: minDate, end: maxDate });
  }

  // Selected product for detail drawer (Amazon tab)
  const [selectedAsin, setSelectedAsin] = useState<string | null>(null);

  // Chart-selected ASINs (max 5)
  const [chartSelectedAsins, setChartSelectedAsins] = useState<string[]>([]);

  // Sort state (Amazon tab)
  const [sortKey, setSortKey] = useState<string>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Fetch Amazon products from API
  const { data: products = [] } = useProducts(
    brandId,
    effectiveDateRange.start,
    effectiveDateRange.end,
    "amazon",
    sortKey,
    sortDir
  );

  // Sort Amazon products (already sorted by API, but if sortKey/dir change client-side we re-sort)
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

  // Fetch data needed for CSV export (lazy — only used on click)
  const { data: adData } = useAdvertising(brandId, effectiveDateRange.start, effectiveDateRange.end);
  const { data: unifiedProducts } = useUnifiedProducts(brandId, effectiveDateRange.start, effectiveDateRange.end);
  const { data: shopifyProds } = useShopifyProducts("shopify_dtc", brandId, effectiveDateRange.start, effectiveDateRange.end);
  const { data: faireProds } = useShopifyProducts("faire", brandId, effectiveDateRange.start, effectiveDateRange.end);

  const handleExport = useCallback(() => {
    if (activeTab === "advertising") {
      if (adData?.hasData && adData.asinBreakdown) {
        exportAdCsv(adData.asinBreakdown, "neurogan-ad-performance.csv");
      }
    } else if (activeTab === "overview") {
      if (unifiedProducts) {
        exportOverviewCsv(unifiedProducts, "neurogan-overview-export.csv");
      }
    } else if (activeTab === "shopify") {
      if (shopifyProds) {
        exportShopifyCsv(shopifyProds, "shopify_dtc", "neurogan-shopify-export.csv");
      }
    } else if (activeTab === "faire") {
      if (faireProds) {
        exportShopifyCsv(faireProds, "faire", "neurogan-faire-export.csv");
      }
    } else {
      exportProfitabilityCsv(sortedProducts, "neurogan-amazon-pl-export.csv");
    }
  }, [activeTab, sortedProducts, adData, unifiedProducts, shopifyProds, faireProds]);

  const selectedProduct = useMemo(() => {
    if (!selectedAsin) return null;
    return products.find((p) => p.asin === selectedAsin) ?? null;
  }, [selectedAsin, products]);

  // Parse meta JSON
  const metaObj = useMemo(() => {
    if (!meta?.["meta"]) return null;
    try { return JSON.parse(meta["meta"]); } catch { return null; }
  }, [meta]);

  if (metaLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader onExport={() => {}} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md mx-auto px-4">
            <h2 className="text-xl font-semibold text-foreground">No data yet</h2>
            <p className="text-sm text-muted-foreground">
              The dashboard is connected and ready. Use the sync feature to import sales data from your channels (Amazon, Shopify, Faire), or seed data to get started.
            </p>
          </div>
        </main>
      </div>
    );
  }

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
              dateRange={effectiveDateRange}
              onDateRangeChange={setDateRange}
              minDate={minDate}
              maxDate={maxDate}
            />
            <OverviewTab dateRange={effectiveDateRange} minDate={minDate} maxDate={maxDate} />
          </TabsContent>

          {/* Tab 2: Amazon */}
          <TabsContent value="amazon" className="space-y-4">
            <div className="flex justify-end">
              <ChannelSettingsButton channel="amazon" />
            </div>
            <HeroChart selectedAsins={chartSelectedAsins} />
            <KpiCards dateRange={effectiveDateRange} minDate={minDate} maxDate={maxDate} />
            <DateRangeSelector
              dateRange={effectiveDateRange}
              onDateRangeChange={setDateRange}
              minDate={minDate}
              maxDate={maxDate}
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
              dateRange={effectiveDateRange}
              minDate={minDate}
              maxDate={maxDate}
            />
            <ProductDetailDrawer
              product={selectedProduct}
              dateRange={effectiveDateRange}
              onClose={() => setSelectedAsin(null)}
              open={!!selectedProduct}
            />
          </TabsContent>

          {/* Tab 3: Shopify */}
          <TabsContent value="shopify" className="space-y-4">
            <div className="flex justify-end">
              <ChannelSettingsButton channel="shopify_dtc" />
            </div>
            <DateRangeSelector
              dateRange={effectiveDateRange}
              onDateRangeChange={setDateRange}
              minDate={minDate}
              maxDate={maxDate}
            />
            <ChannelTab channel="shopify_dtc" dateRange={effectiveDateRange} minDate={minDate} maxDate={maxDate} />
          </TabsContent>

          {/* Tab 4: Faire/Wholesale */}
          <TabsContent value="faire" className="space-y-4">
            <div className="flex justify-end">
              <ChannelSettingsButton channel="faire" />
            </div>
            <DateRangeSelector
              dateRange={effectiveDateRange}
              onDateRangeChange={setDateRange}
              minDate={minDate}
              maxDate={maxDate}
            />
            <ChannelTab channel="faire" dateRange={effectiveDateRange} minDate={minDate} maxDate={maxDate} />
          </TabsContent>

          {/* Tab 5: Advertising */}
          <TabsContent value="advertising" className="space-y-4">
            <div className="flex justify-end">
              <ChannelSettingsButton channel="advertising" />
            </div>
            <DateRangeSelector
              dateRange={effectiveDateRange}
              onDateRangeChange={setDateRange}
              minDate={minDate}
              maxDate={maxDate}
            />
            <AdvertisingTab dateRange={effectiveDateRange} />
          </TabsContent>

          {/* Tab 6: Pareto Analysis */}
          <TabsContent value="pareto" className="space-y-4">
            <DateRangeSelector
              dateRange={effectiveDateRange}
              onDateRangeChange={setDateRange}
              minDate={minDate}
              maxDate={maxDate}
            />
            <ParetoTab dateRange={effectiveDateRange} />
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
                <span>Amazon: {metaObj?.salesDataSource ?? "SP-API"}</span>
                <span>Shopify DTC: Shopify Admin API</span>
                <span>Faire: Faire Orders API</span>
                <span>{metaObj?.adDataSource ?? "Amazon Ads API"}</span>
                <span>{metaObj?.cogsDataSource ?? "QuickBooks"}</span>
                {metaObj?.feeDataSource && <span>Fees: {metaObj.feeDataSource}</span>}
              </div>
            </div>
            <PerplexityAttribution />
          </div>
        </div>
      </footer>
    </div>
  );
}
