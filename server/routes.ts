import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./storage";
import { weeklyMetrics, products, adWeeklySummary, cogsPeriods } from "@shared/schema";
import { sql, eq, and, gte, lte, desc, asc, sum, count, avg } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Helper: parse date range from query params ────────────────────────
  function parseDateRange(req: any) {
    const startDate = (req.query.startDate as string) || "2024-01-01";
    const endDate = (req.query.endDate as string) || "2099-12-31";
    return { startDate, endDate };
  }

  // ── GET /api/overview ─────────────────────────────────────────────────
  // Summary KPIs across all channels for a date range
  app.get("/api/overview", async (req, res) => {
    try {
      const { startDate, endDate } = parseDateRange(req);

      const rows = await db
        .select({
          channel: weeklyMetrics.channel,
          totalRevenue: sum(weeklyMetrics.revenue).mapWith(Number),
          totalUnits: sum(weeklyMetrics.unitsSold).mapWith(Number),
          totalOrders: sum(weeklyMetrics.orderCount).mapWith(Number),
          totalNetProfit: sum(weeklyMetrics.netProfit).mapWith(Number),
          totalAmazonFees: sum(weeklyMetrics.totalAmazonFees).mapWith(Number),
          totalAdSpend: sum(weeklyMetrics.adSpend).mapWith(Number),
          totalCogs: sum(weeklyMetrics.totalCogs).mapWith(Number),
          totalPaymentFees: sum(weeklyMetrics.paymentFees).mapWith(Number),
        })
        .from(weeklyMetrics)
        .where(
          and(
            gte(weeklyMetrics.weekStartDate, startDate),
            lte(weeklyMetrics.weekStartDate, endDate)
          )
        )
        .groupBy(weeklyMetrics.channel);

      // Aggregate totals
      const totals = {
        revenue: 0,
        units: 0,
        orders: 0,
        netProfit: 0,
        amazonFees: 0,
        adSpend: 0,
        cogs: 0,
        paymentFees: 0,
      };
      const byChannel: Record<string, any> = {};

      for (const row of rows) {
        totals.revenue += row.totalRevenue || 0;
        totals.units += row.totalUnits || 0;
        totals.orders += row.totalOrders || 0;
        totals.netProfit += row.totalNetProfit || 0;
        totals.amazonFees += row.totalAmazonFees || 0;
        totals.adSpend += row.totalAdSpend || 0;
        totals.cogs += row.totalCogs || 0;
        totals.paymentFees += row.totalPaymentFees || 0;
        byChannel[row.channel!] = {
          revenue: row.totalRevenue || 0,
          units: row.totalUnits || 0,
          orders: row.totalOrders || 0,
          netProfit: row.totalNetProfit || 0,
        };
      }

      res.json({ totals, byChannel, dateRange: { startDate, endDate } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/channel-mix ──────────────────────────────────────────────
  app.get("/api/channel-mix", async (req, res) => {
    try {
      const { startDate, endDate } = parseDateRange(req);

      const rows = await db
        .select({
          channel: weeklyMetrics.channel,
          revenue: sum(weeklyMetrics.revenue).mapWith(Number),
          units: sum(weeklyMetrics.unitsSold).mapWith(Number),
          orders: sum(weeklyMetrics.orderCount).mapWith(Number),
          netProfit: sum(weeklyMetrics.netProfit).mapWith(Number),
        })
        .from(weeklyMetrics)
        .where(
          and(
            gte(weeklyMetrics.weekStartDate, startDate),
            lte(weeklyMetrics.weekStartDate, endDate)
          )
        )
        .groupBy(weeklyMetrics.channel);

      const totalRevenue = rows.reduce((s, r) => s + (r.revenue || 0), 0);

      const result = rows.map((r) => ({
        channel: r.channel,
        revenue: r.revenue || 0,
        pctOfTotal: totalRevenue > 0 ? ((r.revenue || 0) / totalRevenue) * 100 : 0,
        units: r.units || 0,
        orders: r.orders || 0,
        netProfit: r.netProfit || 0,
      }));

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/products ─────────────────────────────────────────────────
  // Aggregated product-level data for the product table
  app.get("/api/products", async (req, res) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const channel = req.query.channel as string | undefined;

      let query = db
        .select({
          sku: weeklyMetrics.sku,
          asin: weeklyMetrics.asin,
          productTitle: weeklyMetrics.productTitle,
          channel: weeklyMetrics.channel,
          revenue: sum(weeklyMetrics.revenue).mapWith(Number),
          units: sum(weeklyMetrics.unitsSold).mapWith(Number),
          orders: sum(weeklyMetrics.orderCount).mapWith(Number),
          amazonFees: sum(weeklyMetrics.totalAmazonFees).mapWith(Number),
          paymentFees: sum(weeklyMetrics.paymentFees).mapWith(Number),
          netProceeds: sum(weeklyMetrics.netProceeds).mapWith(Number),
          cogs: sum(weeklyMetrics.totalCogs).mapWith(Number),
          adSpend: sum(weeklyMetrics.adSpend).mapWith(Number),
          adSales: sum(weeklyMetrics.adSales).mapWith(Number),
          netProfit: sum(weeklyMetrics.netProfit).mapWith(Number),
          b2bRevenue: sum(weeklyMetrics.b2bRevenue).mapWith(Number),
          b2cRevenue: sum(weeklyMetrics.b2cRevenue).mapWith(Number),
          b2bUnits: sum(weeklyMetrics.b2bUnits).mapWith(Number),
          refundUnits: sum(weeklyMetrics.refundUnits).mapWith(Number),
        })
        .from(weeklyMetrics)
        .where(
          and(
            gte(weeklyMetrics.weekStartDate, startDate),
            lte(weeklyMetrics.weekStartDate, endDate),
            channel ? eq(weeklyMetrics.channel, channel) : undefined
          )
        )
        .groupBy(
          weeklyMetrics.sku,
          weeklyMetrics.asin,
          weeklyMetrics.productTitle,
          weeklyMetrics.channel
        )
        .orderBy(desc(sum(weeklyMetrics.revenue)));

      const rows = await query;

      const result = rows.map((r) => ({
        sku: r.sku,
        asin: r.asin,
        productTitle: r.productTitle,
        channel: r.channel,
        revenue: r.revenue || 0,
        units: r.units || 0,
        orders: r.orders || 0,
        amazonFees: r.amazonFees || 0,
        paymentFees: r.paymentFees || 0,
        netProceeds: r.netProceeds || 0,
        cogs: r.cogs || 0,
        adSpend: r.adSpend || 0,
        adSales: r.adSales || 0,
        netProfit: r.netProfit || 0,
        margin: (r.revenue || 0) > 0 ? ((r.netProfit || 0) / (r.revenue || 0)) * 100 : null,
        tacos: (r.revenue || 0) > 0 && (r.adSpend || 0) > 0 ? ((r.adSpend || 0) / (r.revenue || 0)) * 100 : null,
        avgPrice: (r.units || 0) > 0 ? (r.revenue || 0) / (r.units || 0) : null,
        b2bRevenue: r.b2bRevenue || 0,
        b2cRevenue: r.b2cRevenue || 0,
        b2bUnits: r.b2bUnits || 0,
        refundUnits: r.refundUnits || 0,
      }));

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/weekly-chart ─────────────────────────────────────────────
  // Time series for the hero chart (revenue by channel per week)
  app.get("/api/weekly-chart", async (req, res) => {
    try {
      const { startDate, endDate } = parseDateRange(req);

      const rows = await db
        .select({
          week: weeklyMetrics.weekStartDate,
          channel: weeklyMetrics.channel,
          revenue: sum(weeklyMetrics.revenue).mapWith(Number),
          units: sum(weeklyMetrics.unitsSold).mapWith(Number),
          orders: sum(weeklyMetrics.orderCount).mapWith(Number),
          netProfit: sum(weeklyMetrics.netProfit).mapWith(Number),
          adSpend: sum(weeklyMetrics.adSpend).mapWith(Number),
          adSales: sum(weeklyMetrics.adSales).mapWith(Number),
          cogs: sum(weeklyMetrics.totalCogs).mapWith(Number),
        })
        .from(weeklyMetrics)
        .where(
          and(
            gte(weeklyMetrics.weekStartDate, startDate),
            lte(weeklyMetrics.weekStartDate, endDate)
          )
        )
        .groupBy(weeklyMetrics.weekStartDate, weeklyMetrics.channel)
        .orderBy(asc(weeklyMetrics.weekStartDate));

      // Pivot into {week, amazonRevenue, shopifyRevenue, faireRevenue, ...}
      const weekMap: Record<string, any> = {};
      for (const row of rows) {
        if (!weekMap[row.week!]) {
          weekMap[row.week!] = {
            week: row.week,
            amazonRevenue: 0,
            shopifyRevenue: 0,
            faireRevenue: 0,
            totalRevenue: 0,
            totalNetProfit: 0,
            totalUnits: 0,
            totalOrders: 0,
            totalAdSpend: 0,
            totalAdSales: 0,
          };
        }
        const w = weekMap[row.week!];
        const rev = row.revenue || 0;
        const np = row.netProfit || 0;

        w.totalRevenue += rev;
        w.totalNetProfit += np;
        w.totalUnits += row.units || 0;
        w.totalOrders += row.orders || 0;
        w.totalAdSpend += row.adSpend || 0;
        w.totalAdSales += row.adSales || 0;

        if (row.channel === "amazon") w.amazonRevenue = rev;
        else if (row.channel === "shopify_dtc") w.shopifyRevenue = rev;
        else if (row.channel === "faire") w.faireRevenue = rev;
      }

      res.json(Object.values(weekMap).sort((a: any, b: any) => a.week.localeCompare(b.week)));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/product/:sku ─────────────────────────────────────────────
  // All data for a specific product across channels
  app.get("/api/product/:sku", async (req, res) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const sku = req.params.sku;

      // Get product info
      const productRows = await db
        .select()
        .from(products)
        .where(eq(products.sku, sku));
      const product = productRows[0] || null;

      // Get weekly metrics
      const metrics = await db
        .select()
        .from(weeklyMetrics)
        .where(
          and(
            eq(weeklyMetrics.sku, sku),
            gte(weeklyMetrics.weekStartDate, startDate),
            lte(weeklyMetrics.weekStartDate, endDate)
          )
        )
        .orderBy(asc(weeklyMetrics.weekStartDate));

      // Get ad data
      const asin = product?.asin;
      let adData: any[] = [];
      if (asin) {
        adData = await db
          .select()
          .from(adWeeklySummary)
          .where(
            and(
              eq(adWeeklySummary.asin, asin),
              gte(adWeeklySummary.weekStartDate, startDate),
              lte(adWeeklySummary.weekStartDate, endDate)
            )
          )
          .orderBy(asc(adWeeklySummary.weekStartDate));
      }

      // Get COGS
      const cogsData = await db
        .select()
        .from(cogsPeriods)
        .where(eq(cogsPeriods.sku, sku));

      res.json({ product, weeklyMetrics: metrics, adData, cogsData });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/advertising ──────────────────────────────────────────────
  app.get("/api/advertising", async (req, res) => {
    try {
      const { startDate, endDate } = parseDateRange(req);

      // Weekly totals
      const weeklyTrend = await db
        .select({
          week: adWeeklySummary.weekStartDate,
          totalSpend: sum(adWeeklySummary.spend).mapWith(Number),
          totalAdSales: sum(adWeeklySummary.adSales).mapWith(Number),
          totalClicks: sum(adWeeklySummary.clicks).mapWith(Number),
          totalImpressions: sum(adWeeklySummary.impressions).mapWith(Number),
          totalOrders: sum(adWeeklySummary.orders).mapWith(Number),
        })
        .from(adWeeklySummary)
        .where(
          and(
            gte(adWeeklySummary.weekStartDate, startDate),
            lte(adWeeklySummary.weekStartDate, endDate)
          )
        )
        .groupBy(adWeeklySummary.weekStartDate)
        .orderBy(asc(adWeeklySummary.weekStartDate));

      // Per-ASIN breakdown
      const asinBreakdown = await db
        .select({
          asin: adWeeklySummary.asin,
          spend: sum(adWeeklySummary.spend).mapWith(Number),
          adSales: sum(adWeeklySummary.adSales).mapWith(Number),
          clicks: sum(adWeeklySummary.clicks).mapWith(Number),
          impressions: sum(adWeeklySummary.impressions).mapWith(Number),
          orders: sum(adWeeklySummary.orders).mapWith(Number),
          totalRevenue: sum(adWeeklySummary.totalRevenue).mapWith(Number),
        })
        .from(adWeeklySummary)
        .where(
          and(
            gte(adWeeklySummary.weekStartDate, startDate),
            lte(adWeeklySummary.weekStartDate, endDate)
          )
        )
        .groupBy(adWeeklySummary.asin)
        .orderBy(desc(sum(adWeeklySummary.spend)));

      // KPIs
      const totalSpend = weeklyTrend.reduce((s, r) => s + (r.totalSpend || 0), 0);
      const totalAdSales = weeklyTrend.reduce((s, r) => s + (r.totalAdSales || 0), 0);
      const totalClicks = weeklyTrend.reduce((s, r) => s + (r.totalClicks || 0), 0);
      const totalImpressions = weeklyTrend.reduce((s, r) => s + (r.totalImpressions || 0), 0);

      res.json({
        kpis: {
          totalSpend,
          totalAdSales,
          acos: totalAdSales > 0 ? (totalSpend / totalAdSales) * 100 : null,
          totalClicks,
          totalImpressions,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null,
          cpc: totalClicks > 0 ? totalSpend / totalClicks : null,
        },
        weeklyTrend: weeklyTrend.map((r) => ({
          ...r,
          acos: (r.totalAdSales || 0) > 0 ? ((r.totalSpend || 0) / (r.totalAdSales || 0)) * 100 : null,
        })),
        asinBreakdown: asinBreakdown.map((r) => ({
          ...r,
          acos: (r.adSales || 0) > 0 ? ((r.spend || 0) / (r.adSales || 0)) * 100 : null,
          tacos: (r.totalRevenue || 0) > 0 ? ((r.spend || 0) / (r.totalRevenue || 0)) * 100 : null,
          cpc: (r.clicks || 0) > 0 ? (r.spend || 0) / (r.clicks || 0) : null,
          ctr: (r.impressions || 0) > 0 ? ((r.clicks || 0) / (r.impressions || 0)) * 100 : null,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/pareto ───────────────────────────────────────────────────
  app.get("/api/pareto", async (req, res) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const metric = (req.query.metric as string) || "revenue";

      const metricCol = metric === "profit" ? weeklyMetrics.netProfit : weeklyMetrics.revenue;

      const rows = await db
        .select({
          sku: weeklyMetrics.sku,
          productTitle: weeklyMetrics.productTitle,
          value: sum(metricCol).mapWith(Number),
          revenue: sum(weeklyMetrics.revenue).mapWith(Number),
          units: sum(weeklyMetrics.unitsSold).mapWith(Number),
          cogs: sum(weeklyMetrics.totalCogs).mapWith(Number),
          adSpend: sum(weeklyMetrics.adSpend).mapWith(Number),
          netProfit: sum(weeklyMetrics.netProfit).mapWith(Number),
        })
        .from(weeklyMetrics)
        .where(
          and(
            gte(weeklyMetrics.weekStartDate, startDate),
            lte(weeklyMetrics.weekStartDate, endDate)
          )
        )
        .groupBy(weeklyMetrics.sku, weeklyMetrics.productTitle)
        .orderBy(desc(sum(metricCol)));

      // Calculate cumulative percentages and tiers
      const totalValue = rows.reduce((s, r) => s + (r.value || 0), 0);
      let cumulative = 0;
      const ranked = rows.map((r, i) => {
        cumulative += r.value || 0;
        const cumulativePct = totalValue > 0 ? (cumulative / totalValue) * 100 : 0;
        let tier = "TAIL";
        if (cumulativePct <= 80) tier = "CORE";
        else if (cumulativePct <= 95) tier = "MID";
        if ((r.value || 0) < 0) tier = "DRAG";

        return {
          sku: r.sku,
          productTitle: r.productTitle,
          value: r.value || 0,
          revenue: r.revenue || 0,
          units: r.units || 0,
          cogs: r.cogs || 0,
          adSpend: r.adSpend || 0,
          netProfit: r.netProfit || 0,
          margin: (r.revenue || 0) > 0 ? ((r.netProfit || 0) / (r.revenue || 0)) * 100 : null,
          pctOfTotal: totalValue > 0 ? ((r.value || 0) / totalValue) * 100 : 0,
          cumulativePct,
          tier,
          rank: i + 1,
        };
      });

      const coreCount = ranked.filter((r) => r.tier === "CORE").length;
      const dragCount = ranked.filter((r) => r.tier === "DRAG").length;
      const topProduct = ranked[0];

      // Gini coefficient
      const n = ranked.length;
      const sortedValues = ranked.map((r) => r.value).sort((a, b) => a - b);
      let giniSum = 0;
      for (let i = 0; i < n; i++) {
        giniSum += (2 * (i + 1) - n - 1) * sortedValues[i];
      }
      const gini = n > 0 && totalValue > 0 ? giniSum / (n * totalValue) : 0;

      res.json({
        products: ranked,
        summary: {
          totalProducts: ranked.length,
          coreCount,
          corePct: ranked.length > 0 ? (coreCount / ranked.length) * 100 : 0,
          dragCount,
          topProduct: topProduct
            ? { sku: topProduct.sku, productTitle: topProduct.productTitle, pctOfTotal: topProduct.pctOfTotal }
            : null,
          gini: Math.round(gini * 100) / 100,
          metric,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST /api/sync — Run data ingestion for a date range ──────────────

  app.post("/api/sync", async (req, res) => {
    const { startDate, endDate } = req.body as { startDate?: string; endDate?: string };
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    try {
      const { syncAll } = await import("./ingestion/index");
      const results = await syncAll(startDate, endDate);
      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ error: `Sync failed: ${err.message}` });
    }
  });

  // ─── GET /api/cogs-periods — COGS data ──────────────────────────────────

  app.get("/api/cogs-periods", async (req, res) => {
    const { sku } = req.query as { sku?: string };
    const conditions = [];
    if (sku) conditions.push(eq(cogsPeriods.sku, sku));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.select().from(cogsPeriods).where(whereClause);
    res.json(rows);
  });

  // ─── GET /api/products-catalog — Product catalog ────────────────────────

  app.get("/api/products-catalog", async (_req, res) => {
    const rows = await db.select().from(products);
    res.json(rows);
  });

  return httpServer;
}
