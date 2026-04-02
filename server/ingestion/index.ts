/**
 * Data ingestion orchestrator.
 *
 * Runs all four ingestion modules. Each module is independent —
 * one failing doesn't block the others.
 */
import { pullAmazonOrderMetrics } from "./amazon-sp-api";
import { pullAmazonAdMetrics } from "./amazon-ads";
import { pullShopifyOrders } from "./shopify";
import { pullQuickBooksCogs } from "./quickbooks";

export interface SyncResult {
  module: string;
  inserted: number;
  errors: string[];
  durationMs: number;
}

export async function syncAll(
  startDate: string,
  endDate: string,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  const modules = [
    { name: "amazon-orders", fn: () => pullAmazonOrderMetrics(startDate, endDate) },
    { name: "amazon-ads", fn: () => pullAmazonAdMetrics(startDate, endDate) },
    { name: "shopify", fn: () => pullShopifyOrders(startDate, endDate) },
    { name: "quickbooks-cogs", fn: () => pullQuickBooksCogs() },
  ];

  for (const mod of modules) {
    const start = Date.now();
    try {
      const result = await mod.fn();
      results.push({
        module: mod.name,
        inserted: result.inserted,
        errors: result.errors,
        durationMs: Date.now() - start,
      });
    } catch (err: any) {
      results.push({
        module: mod.name,
        inserted: 0,
        errors: [`Unhandled error: ${err.message}`],
        durationMs: Date.now() - start,
      });
    }
  }

  return results;
}
