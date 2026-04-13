/**
 * Ingestion Orchestrator
 *
 * Runs all data ingestion jobs. Each module is independent —
 * one failing doesn't block the others.
 *
 * Usage:
 *   POST /api/sync?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *   or: DATABASE_URL=... npx tsx server/ingestion/index.ts
 */
import { syncAmazonProducts, syncAmazonSales } from "./amazon-sp-api";
import { syncAmazonAds } from "./amazon-ads";
import { syncShopifyOrders } from "./shopify";
import { syncQuickBooksCogs } from "./quickbooks";

export interface SyncResult {
  module: string;
  status: string;
  updated?: number;
  errors?: string[];
  reason?: string;
}

/**
 * Run all ingestion modules for the given date range
 */
export async function syncAll(
  startDate: string,
  endDate: string
): Promise<SyncResult[]> {
  console.log(`\n========================================`);
  console.log(`  Data Sync: ${startDate} to ${endDate}`);
  console.log(`========================================\n`);

  const results: SyncResult[] = [];

  // 0. Discover/update Amazon product catalog
  try {
    const r = await syncAmazonProducts();
    results.push({ module: "amazon-products", ...r });
  } catch (err: any) {
    results.push({ module: "amazon-products", status: "error", errors: [err.message] });
  }

  // 1. Amazon Sales (SP-API)
  try {
    const r = await syncAmazonSales(startDate, endDate);
    results.push({ module: "amazon-sp-api", ...r });
  } catch (err: any) {
    results.push({ module: "amazon-sp-api", status: "error", errors: [err.message] });
  }

  // 2. Amazon Ads (MarketplaceAdPros)
  try {
    const r = await syncAmazonAds(startDate, endDate);
    results.push({ module: "amazon-ads", ...r });
  } catch (err: any) {
    results.push({ module: "amazon-ads", status: "error", errors: [err.message] });
  }

  // 3. Shopify Orders
  try {
    const r = await syncShopifyOrders(startDate, endDate);
    results.push({ module: "shopify", ...r });
  } catch (err: any) {
    results.push({ module: "shopify", status: "error", errors: [err.message] });
  }

  // 4. QuickBooks COGS
  try {
    const r = await syncQuickBooksCogs();
    results.push({ module: "quickbooks", ...r });
  } catch (err: any) {
    results.push({ module: "quickbooks", status: "error", errors: [err.message] });
  }

  console.log("\n=== Sync Summary ===");
  for (const r of results) {
    const icon = r.status === "completed" ? "✓" : r.status === "skipped" ? "○" : "✗";
    console.log(`  ${icon} ${r.module}: ${r.status}${r.updated ? ` (${r.updated} rows)` : ""}${r.reason ? ` — ${r.reason}` : ""}`);
  }

  return results;
}

// Allow running directly: npx tsx server/ingestion/index.ts
// Guard: only run when invoked directly via CLI, not when bundled into the server
if (require.main === module && process.argv[1]?.includes("ingestion")) {
  const startDate = process.argv[2] || new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const endDate = process.argv[3] || new Date().toISOString().split("T")[0];
  syncAll(startDate, endDate)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
