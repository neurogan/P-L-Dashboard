import type { Express } from "express";
import { type Server } from "http";
import { db } from "./storage";
import {
  weeklyMetrics,
  products,
  adWeeklySummary,
  cogsPeriods,
  dashboardMeta,
} from "@shared/schema";
import { sql, eq, and, gte, lte, asc, desc, inArray } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // ─── GET /api/meta — Dashboard metadata (date range, data sources) ──────

  app.get("/api/meta", async (_req, res) => {
    const rows = await db.select().from(dashboardMeta);
    const meta: Record<string, string> = {};
    for (const row of rows) {
      meta[row.key] = row.value;
    }
    res.json(meta);
  });

  // ─── GET /api/overview — Aggregated KPIs across all channels ────────────

  app.get("/api/overview", async (req, res) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const conditions = [];
    if (startDate) conditions.push(gte(weeklyMetrics.weekStartDate, startDate));
    if (endDate) conditions.push(lte(weeklyMetrics.weekStartDate, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        channel: weeklyMetrics.channel,
        revenue: sql<number>`COALESCE(SUM(${weeklyMetrics.revenue}), 0)`,
        units: sql<number>`COALESCE(SUM(${weeklyMetrics.unitsSold}), 0)`,
        orders: sql<number>`COALESCE(SUM(${weeklyMetrics.orderCount}), 0)`,
        netProfit: sql<number | null>`SUM(${weeklyMetrics.netProfit})`,
        totalAmazonFees: sql<number | null>`SUM(${weeklyMetrics.totalAmazonFees})`,
        adSpend: sql<number | null>`SUM(${weeklyMetrics.adSpend})`,
      })
      .from(weeklyMetrics)
      .where(whereClause)
      .groupBy(weeklyMetrics.channel);

    let totalRevenue = 0;
    let totalUnits = 0;
    let totalOrders = 0;
    let totalNetProfit: number | null = null;
    let totalAmazonFees: number | null = null;
    let totalAdSpend: number | null = null;

    const channelBreakdown: Record<string, { revenue: number; units: number; orders: number; netProfit: number | null }> = {};

    for (const row of rows) {
      const rev = Number(row.revenue) || 0;
      const units = Number(row.units) || 0;
      const orders = Number(row.orders) || 0;
      const np = row.netProfit != null ? Number(row.netProfit) : null;
      const fees = row.totalAmazonFees != null ? Number(row.totalAmazonFees) : null;
      const ads = row.adSpend != null ? Number(row.adSpend) : null;

      totalRevenue += rev;
      totalUnits += units;
      totalOrders += orders;
      if (np != null) totalNetProfit = (totalNetProfit ?? 0) + np;
      if (fees != null) totalAmazonFees = (totalAmazonFees ?? 0) + fees;
      if (ads != null) totalAdSpend = (totalAdSpend ?? 0) + ads;

      channelBreakdown[row.channel] = { revenue: rev, units, orders, netProfit: np };
    }

    res.json({
      totalRevenue,
      totalUnits,
      totalOrders,
      totalNetProfit,
      totalAmazonFees,
      totalAdSpend,
      amazonRevenue: channelBreakdown["amazon"]?.revenue ?? 0,
      shopifyRevenue: channelBreakdown["shopify_dtc"]?.revenue ?? 0,
      faireRevenue: channelBreakdown["faire"]?.revenue ?? 0,
      amazonUnits: channelBreakdown["amazon"]?.units ?? 0,
      shopifyUnits: channelBreakdown["shopify_dtc"]?.units ?? 0,
      faireUnits: channelBreakdown["faire"]?.units ?? 0,
    });
  });

  // ─── GET /api/channel-mix — Revenue breakdown by channel ────────────────

  app.get("/api/channel-mix", async (req, res) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const conditions = [];
    if (startDate) conditions.push(gte(weeklyMetrics.weekStartDate, startDate));
    if (endDate) conditions.push(lte(weeklyMetrics.weekStartDate, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        channel: weeklyMetrics.channel,
        revenue: sql<number>`COALESCE(SUM(${weeklyMetrics.revenue}), 0)`,
        orders: sql<number>`COALESCE(SUM(${weeklyMetrics.orderCount}), 0)`,
        units: sql<number>`COALESCE(SUM(${weeklyMetrics.unitsSold}), 0)`,
        netProfit: sql<number | null>`SUM(${weeklyMetrics.netProfit})`,
      })
      .from(weeklyMetrics)
      .where(whereClause)
      .groupBy(weeklyMetrics.channel);

    const totalRevenue = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0) || 1;

    const channelLabels: Record<string, string> = {
      amazon: "Amazon",
      shopify_dtc: "Shopify DTC",
      faire: "Faire/Wholesale",
    };

    const result = rows.map((r) => ({
      channel: r.channel,
      label: channelLabels[r.channel] || r.channel,
      revenue: Number(r.revenue) || 0,
      pctOfTotal: (Number(r.revenue) || 0) / totalRevenue,
      orders: Number(r.orders) || 0,
      units: Number(r.units) || 0,
      netProfit: r.netProfit != null ? Number(r.netProfit) : null,
    }));

    res.json(result);
  });

  // ─── GET /api/products — Product-level aggregated data ──────────────────

  app.get("/api/products", async (req, res) => {
    const { startDate, endDate, channel, sortBy, sortDir: sortDirection } = req.query as {
      startDate?: string;
      endDate?: string;
      channel?: string;
      sortBy?: string;
      sortDir?: string;
    };

    const conditions = [];
    if (startDate) conditions.push(gte(weeklyMetrics.weekStartDate, startDate));
    if (endDate) conditions.push(lte(weeklyMetrics.weekStartDate, endDate));
    if (channel) conditions.push(eq(weeklyMetrics.channel, channel));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        sku: weeklyMetrics.sku,
        asin: sql<string | null>`MAX(${weeklyMetrics.asin})`,
        productTitle: sql<string>`MAX(${weeklyMetrics.productTitle})`,
        channel: weeklyMetrics.channel,
        revenue: sql<number>`COALESCE(SUM(${weeklyMetrics.revenue}), 0)`,
        unitsSold: sql<number>`COALESCE(SUM(${weeklyMetrics.unitsSold}), 0)`,
        orderCount: sql<number>`COALESCE(SUM(${weeklyMetrics.orderCount}), 0)`,
        totalCogs: sql<number | null>`SUM(${weeklyMetrics.totalCogs})`,
        totalAmazonFees: sql<number | null>`SUM(${weeklyMetrics.totalAmazonFees})`,
        netProceeds: sql<number | null>`SUM(${weeklyMetrics.netProceeds})`,
        adSpend: sql<number | null>`SUM(${weeklyMetrics.adSpend})`,
        adSales: sql<number | null>`SUM(${weeklyMetrics.adSales})`,
        netProfit: sql<number | null>`SUM(${weeklyMetrics.netProfit})`,
        refundAmount: sql<number | null>`SUM(${weeklyMetrics.refundAmount})`,
        paymentFees: sql<number | null>`SUM(${weeklyMetrics.paymentFees})`,
        hasCogs: sql<boolean>`BOOL_OR(${weeklyMetrics.hasCogs})`,
        b2bRevenue: sql<number | null>`SUM(${weeklyMetrics.b2bRevenue})`,
        b2cRevenue: sql<number | null>`SUM(${weeklyMetrics.b2cRevenue})`,
        b2bUnits: sql<number | null>`SUM(${weeklyMetrics.b2bUnits})`,
      })
      .from(weeklyMetrics)
      .where(whereClause)
      .groupBy(weeklyMetrics.sku, weeklyMetrics.channel);

    const result = rows.map((r) => {
      const revenue = Number(r.revenue) || 0;
      const unitsSold = Number(r.unitsSold) || 0;
      const orderCount = Number(r.orderCount) || 0;
      const adSpend = r.adSpend != null ? Number(r.adSpend) : null;
      const adSales = r.adSales != null ? Number(r.adSales) : null;
      const netProfit = r.netProfit != null ? Number(r.netProfit) : null;

      return {
        sku: r.sku,
        asin: r.asin,
        productTitle: r.productTitle,
        channel: r.channel,
        revenue,
        unitsSold,
        orderCount,
        totalCogs: r.totalCogs != null ? Number(r.totalCogs) : null,
        totalAmazonFees: r.totalAmazonFees != null ? Number(r.totalAmazonFees) : null,
        netProceeds: r.netProceeds != null ? Number(r.netProceeds) : null,
        adSpend,
        adSales,
        netProfit,
        marginPct: netProfit != null && revenue > 0 ? netProfit / revenue : null,
        avgPrice: unitsSold > 0 ? revenue / unitsSold : 0,
        tacos: adSpend != null && revenue > 0 ? adSpend / revenue : null,
        acos: adSpend != null && adSales != null && adSales > 0 ? adSpend / adSales : null,
        refundAmount: r.refundAmount != null ? Number(r.refundAmount) : null,
        paymentFees: r.paymentFees != null ? Number(r.paymentFees) : null,
        hasCogs: r.hasCogs,
        avgUnitsPerOrder: orderCount > 0 ? unitsSold / orderCount : null,
        revenuePerOrder: orderCount > 0 ? revenue / orderCount : null,
        b2bRevenue: r.b2bRevenue != null ? Number(r.b2bRevenue) : null,
        b2cRevenue: r.b2cRevenue != null ? Number(r.b2cRevenue) : null,
        b2bUnits: r.b2bUnits != null ? Number(r.b2bUnits) : null,
      };
    });

    // Sort
    const key = (sortBy || "revenue") as string;
    const dir = sortDirection === "asc" ? 1 : -1;
    result.sort((a, b) => {
      const aVal = (a as any)[key] ?? -Infinity;
      const bVal = (b as any)[key] ?? -Infinity;
      return (aVal - bVal) * dir;
    });

    res.json(result);
  });

  // ─── GET /api/unified-products — Cross-channel per-SKU aggregation ──────

  app.get("/api/unified-products", async (req, res) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const conditions = [];
    if (startDate) conditions.push(gte(weeklyMetrics.weekStartDate, startDate));
    if (endDate) conditions.push(lte(weeklyMetrics.weekStartDate, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        sku: weeklyMetrics.sku,
        channel: weeklyMetrics.channel,
        revenue: sql<number>`COALESCE(SUM(${weeklyMetrics.revenue}), 0)`,
        units: sql<number>`COALESCE(SUM(${weeklyMetrics.unitsSold}), 0)`,
        orders: sql<number>`COALESCE(SUM(${weeklyMetrics.orderCount}), 0)`,
        netProfit: sql<number | null>`SUM(${weeklyMetrics.netProfit})`,
      })
      .from(weeklyMetrics)
      .where(whereClause)
      .groupBy(weeklyMetrics.sku, weeklyMetrics.channel);

    // Aggregate per SKU across channels
    const skuMap = new Map<string, {
      sku: string; asin: string | null; productTitle: string; channels: string[];
      amazonRev: number; shopifyRev: number; faireRev: number;
      totalRev: number; totalUnits: number; totalOrders: number;
      netProfit: number | null;
    }>();

    // Get product catalog for title/asin/channels
    const productList = await db.select().from(products);
    const productBySku = new Map(productList.map((p) => [p.sku, p]));

    for (const r of rows) {
      const rev = Number(r.revenue) || 0;
      const units = Number(r.units) || 0;
      const orders = Number(r.orders) || 0;
      const np = r.netProfit != null ? Number(r.netProfit) : null;

      if (!skuMap.has(r.sku)) {
        const prod = productBySku.get(r.sku);
        skuMap.set(r.sku, {
          sku: r.sku,
          asin: prod?.asin ?? null,
          productTitle: prod?.productTitle ?? r.sku,
          channels: prod?.channels ?? [],
          amazonRev: 0, shopifyRev: 0, faireRev: 0,
          totalRev: 0, totalUnits: 0, totalOrders: 0,
          netProfit: null,
        });
      }

      const entry = skuMap.get(r.sku)!;
      entry.totalRev += rev;
      entry.totalUnits += units;
      entry.totalOrders += orders;
      if (np != null) entry.netProfit = (entry.netProfit ?? 0) + np;

      if (r.channel === "amazon") entry.amazonRev += rev;
      else if (r.channel === "shopify_dtc") entry.shopifyRev += rev;
      else if (r.channel === "faire") entry.faireRev += rev;
    }

    const result = Array.from(skuMap.values()).map((s) => ({
      ...s,
      marginPct: s.netProfit != null && s.totalRev > 0 ? s.netProfit / s.totalRev : null,
    }));

    res.json(result);
  });

  // ─── GET /api/weekly-chart — Weekly time-series data ────────────────────

  app.get("/api/weekly-chart", async (req, res) => {
    const { startDate, endDate, channel } = req.query as {
      startDate?: string; endDate?: string; channel?: string;
    };

    const conditions = [];
    if (startDate) conditions.push(gte(weeklyMetrics.weekStartDate, startDate));
    if (endDate) conditions.push(lte(weeklyMetrics.weekStartDate, endDate));
    if (channel) conditions.push(eq(weeklyMetrics.channel, channel));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        week: weeklyMetrics.weekStartDate,
        channel: weeklyMetrics.channel,
        revenue: sql<number>`COALESCE(SUM(${weeklyMetrics.revenue}), 0)`,
        units: sql<number>`COALESCE(SUM(${weeklyMetrics.unitsSold}), 0)`,
        orders: sql<number>`COALESCE(SUM(${weeklyMetrics.orderCount}), 0)`,
        netProfit: sql<number | null>`SUM(${weeklyMetrics.netProfit})`,
        totalAmazonFees: sql<number | null>`SUM(${weeklyMetrics.totalAmazonFees})`,
        totalCogs: sql<number | null>`SUM(${weeklyMetrics.totalCogs})`,
        adSpend: sql<number | null>`SUM(${weeklyMetrics.adSpend})`,
        adSales: sql<number | null>`SUM(${weeklyMetrics.adSales})`,
        organicSales: sql<number | null>`SUM(${weeklyMetrics.organicSales})`,
        promotions: sql<number | null>`SUM(${weeklyMetrics.promotions})`,
        refundAmount: sql<number | null>`SUM(${weeklyMetrics.refundAmount})`,
        netProceeds: sql<number | null>`SUM(${weeklyMetrics.netProceeds})`,
        paymentFees: sql<number | null>`SUM(${weeklyMetrics.paymentFees})`,
        reimbursement: sql<number | null>`SUM(${weeklyMetrics.reimbursement})`,
      })
      .from(weeklyMetrics)
      .where(whereClause)
      .groupBy(weeklyMetrics.weekStartDate, weeklyMetrics.channel)
      .orderBy(asc(weeklyMetrics.weekStartDate));

    // Pivot: group by week, split by channel
    const weekMap = new Map<string, any>();

    for (const r of rows) {
      if (!weekMap.has(r.week)) {
        weekMap.set(r.week, {
          week: r.week,
          amazonRevenue: 0, shopifyRevenue: 0, faireRevenue: 0, totalRevenue: 0,
          amazonUnits: 0, shopifyUnits: 0, faireUnits: 0, totalUnits: 0,
          amazonOrders: 0, shopifyOrders: 0, faireOrders: 0, totalOrders: 0,
          amazonNetProfit: null as number | null,
          shopifyNetProfit: null as number | null,
          faireNetProfit: null as number | null,
          totalNetProfit: null as number | null,
          totalAmazonFees: null as number | null,
          totalCogs: null as number | null,
          adSpend: null as number | null,
          adSales: null as number | null,
          organicSales: null as number | null,
          promotions: null as number | null,
          refundAmount: null as number | null,
          netProceeds: null as number | null,
          reimbursement: null as number | null,
          paymentFees: null as number | null,
        });
      }

      const w = weekMap.get(r.week)!;
      const rev = Number(r.revenue) || 0;
      const units = Number(r.units) || 0;
      const orders = Number(r.orders) || 0;
      const np = r.netProfit != null ? Number(r.netProfit) : null;

      w.totalRevenue += rev;
      w.totalUnits += units;
      w.totalOrders += orders;
      if (np != null) w.totalNetProfit = (w.totalNetProfit ?? 0) + np;

      if (r.channel === "amazon") {
        w.amazonRevenue += rev;
        w.amazonUnits += units;
        w.amazonOrders += orders;
        if (np != null) w.amazonNetProfit = (w.amazonNetProfit ?? 0) + np;
        if (r.totalAmazonFees != null) w.totalAmazonFees = (w.totalAmazonFees ?? 0) + Number(r.totalAmazonFees);
        if (r.totalCogs != null) w.totalCogs = (w.totalCogs ?? 0) + Number(r.totalCogs);
        if (r.adSpend != null) w.adSpend = (w.adSpend ?? 0) + Number(r.adSpend);
        if (r.adSales != null) w.adSales = (w.adSales ?? 0) + Number(r.adSales);
        if (r.organicSales != null) w.organicSales = (w.organicSales ?? 0) + Number(r.organicSales);
        if (r.promotions != null) w.promotions = (w.promotions ?? 0) + Number(r.promotions);
        if (r.refundAmount != null) w.refundAmount = (w.refundAmount ?? 0) + Number(r.refundAmount);
        if (r.netProceeds != null) w.netProceeds = (w.netProceeds ?? 0) + Number(r.netProceeds);
        if (r.reimbursement != null) w.reimbursement = (w.reimbursement ?? 0) + Number(r.reimbursement);
      } else if (r.channel === "shopify_dtc") {
        w.shopifyRevenue += rev;
        w.shopifyUnits += units;
        w.shopifyOrders += orders;
        if (np != null) w.shopifyNetProfit = (w.shopifyNetProfit ?? 0) + np;
        if (r.paymentFees != null) w.paymentFees = (w.paymentFees ?? 0) + Number(r.paymentFees);
      } else if (r.channel === "faire") {
        w.faireRevenue += rev;
        w.faireUnits += units;
        w.faireOrders += orders;
        if (np != null) w.faireNetProfit = (w.faireNetProfit ?? 0) + np;
      }
    }

    res.json(Array.from(weekMap.values()));
  });

  // ─── GET /api/product/:sku — Single product detail ──────────────────────

  app.get("/api/product/:sku", async (req, res) => {
    const { sku } = req.params;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    // Get product info
    const productRows = await db.select().from(products).where(eq(products.sku, sku));
    if (productRows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    const product = productRows[0];

    // Get weekly metrics
    const conditions = [eq(weeklyMetrics.sku, sku)];
    if (startDate) conditions.push(gte(weeklyMetrics.weekStartDate, startDate));
    if (endDate) conditions.push(lte(weeklyMetrics.weekStartDate, endDate));

    const weeklyRows = await db
      .select()
      .from(weeklyMetrics)
      .where(and(...conditions))
      .orderBy(asc(weeklyMetrics.weekStartDate));

    // Get ad data if product has ASIN
    let adData: any[] = [];
    if (product.asin) {
      const adConditions = [eq(adWeeklySummary.asin, product.asin)];
      if (startDate) adConditions.push(gte(adWeeklySummary.weekStartDate, startDate));
      if (endDate) adConditions.push(lte(adWeeklySummary.weekStartDate, endDate));

      adData = await db
        .select()
        .from(adWeeklySummary)
        .where(and(...adConditions))
        .orderBy(asc(adWeeklySummary.weekStartDate));
    }

    // Get COGS periods
    const cogsRows = await db
      .select()
      .from(cogsPeriods)
      .where(eq(cogsPeriods.sku, sku));

    res.json({
      product,
      weeklyMetrics: weeklyRows,
      adData,
      cogsPeriods: cogsRows,
    });
  });

  // ─── GET /api/advertising — Ad performance data ─────────────────────────

  app.get("/api/advertising", async (req, res) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const conditions = [];
    if (startDate) conditions.push(gte(adWeeklySummary.weekStartDate, startDate));
    if (endDate) conditions.push(lte(adWeeklySummary.weekStartDate, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Per-ASIN aggregation
    const asinRows = await db
      .select({
        asin: adWeeklySummary.asin,
        sku: sql<string>`MAX(${adWeeklySummary.sku})`,
        productTitle: sql<string>`MAX(${adWeeklySummary.productTitle})`,
        spend: sql<number>`COALESCE(SUM(${adWeeklySummary.spend}), 0)`,
        impressions: sql<number>`COALESCE(SUM(${adWeeklySummary.impressions}), 0)`,
        clicks: sql<number>`COALESCE(SUM(${adWeeklySummary.clicks}), 0)`,
        orders: sql<number>`COALESCE(SUM(${adWeeklySummary.orders}), 0)`,
        adSales: sql<number>`COALESCE(SUM(${adWeeklySummary.adSales}), 0)`,
        totalRevenue: sql<number>`COALESCE(SUM(${adWeeklySummary.totalRevenue}), 0)`,
      })
      .from(adWeeklySummary)
      .where(whereClause)
      .groupBy(adWeeklySummary.asin);

    // Weekly trend
    const weeklyRows = await db
      .select({
        week: adWeeklySummary.weekStartDate,
        spend: sql<number>`COALESCE(SUM(${adWeeklySummary.spend}), 0)`,
        adSales: sql<number>`COALESCE(SUM(${adWeeklySummary.adSales}), 0)`,
        clicks: sql<number>`COALESCE(SUM(${adWeeklySummary.clicks}), 0)`,
        impressions: sql<number>`COALESCE(SUM(${adWeeklySummary.impressions}), 0)`,
        orders: sql<number>`COALESCE(SUM(${adWeeklySummary.orders}), 0)`,
      })
      .from(adWeeklySummary)
      .where(whereClause)
      .groupBy(adWeeklySummary.weekStartDate)
      .orderBy(asc(adWeeklySummary.weekStartDate));

    const totalSpend = asinRows.reduce((s, r) => s + (Number(r.spend) || 0), 0);
    const totalAdSales = asinRows.reduce((s, r) => s + (Number(r.adSales) || 0), 0);
    const totalClicks = asinRows.reduce((s, r) => s + (Number(r.clicks) || 0), 0);
    const totalImpressions = asinRows.reduce((s, r) => s + (Number(r.impressions) || 0), 0);
    const totalOrders = asinRows.reduce((s, r) => s + (Number(r.orders) || 0), 0);

    const asinBreakdown = asinRows.map((r) => {
      const spend = Number(r.spend) || 0;
      const adSales = Number(r.adSales) || 0;
      const clicks = Number(r.clicks) || 0;
      const impressions = Number(r.impressions) || 0;
      const totalRevenue = Number(r.totalRevenue) || 0;
      return {
        asin: r.asin,
        sku: r.sku,
        productTitle: r.productTitle,
        spend,
        adSales,
        impressions,
        clicks,
        orders: Number(r.orders) || 0,
        totalRevenue,
        acos: adSales > 0 ? spend / adSales : 0,
        tacos: totalRevenue > 0 ? spend / totalRevenue : 0,
        ctr: impressions > 0 ? clicks / impressions : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
      };
    });

    const weeklyData = weeklyRows.map((w) => {
      const spend = Number(w.spend) || 0;
      const adSales = Number(w.adSales) || 0;
      return {
        week: w.week,
        spend,
        acos: adSales > 0 ? spend / adSales : 0,
      };
    });

    res.json({
      totalSpend,
      totalAdSales,
      acos: totalAdSales > 0 ? totalSpend / totalAdSales : 0,
      totalClicks,
      totalImpressions,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      totalOrders,
      weeklyData,
      asinBreakdown,
      hasData: asinRows.length > 0,
    });
  });

  // ─── GET /api/pareto — Pareto/concentration analysis ────────────────────

  app.get("/api/pareto", async (req, res) => {
    const { startDate, endDate, metric } = req.query as {
      startDate?: string; endDate?: string; metric?: string;
    };

    const conditions = [];
    if (startDate) conditions.push(gte(weeklyMetrics.weekStartDate, startDate));
    if (endDate) conditions.push(lte(weeklyMetrics.weekStartDate, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        sku: weeklyMetrics.sku,
        channel: weeklyMetrics.channel,
        revenue: sql<number>`COALESCE(SUM(${weeklyMetrics.revenue}), 0)`,
        netProfit: sql<number | null>`SUM(${weeklyMetrics.netProfit})`,
        hasCogs: sql<boolean>`BOOL_OR(${weeklyMetrics.hasCogs})`,
      })
      .from(weeklyMetrics)
      .where(whereClause)
      .groupBy(weeklyMetrics.sku, weeklyMetrics.channel);

    // Combine across channels per SKU
    const skuMap = new Map<string, {
      sku: string; productTitle: string; revenue: number;
      netProfit: number | null; hasCogs: boolean; channels: string[];
    }>();

    const productList = await db.select().from(products);
    const productBySku = new Map(productList.map((p) => [p.sku, p]));

    for (const r of rows) {
      const existing = skuMap.get(r.sku);
      const rev = Number(r.revenue) || 0;
      const np = r.netProfit != null ? Number(r.netProfit) : null;
      const prod = productBySku.get(r.sku);

      if (existing) {
        existing.revenue += rev;
        if (np != null) existing.netProfit = (existing.netProfit ?? 0) + np;
        if (r.hasCogs) existing.hasCogs = true;
        if (!existing.channels.includes(r.channel)) existing.channels.push(r.channel);
      } else {
        skuMap.set(r.sku, {
          sku: r.sku,
          productTitle: prod?.productTitle ?? r.sku,
          revenue: rev,
          netProfit: np,
          hasCogs: r.hasCogs,
          channels: [r.channel],
        });
      }
    }

    res.json(Array.from(skuMap.values()));
  });

  // ─── GET /api/hero-chart — Amazon-only weekly aggregated hero chart ─────

  app.get("/api/hero-chart", async (req, res) => {
    const rows = await db
      .select({
        week: weeklyMetrics.weekStartDate,
        revenue: sql<number>`COALESCE(SUM(${weeklyMetrics.revenue}), 0)`,
        units: sql<number>`COALESCE(SUM(${weeklyMetrics.unitsSold}), 0)`,
        orders: sql<number>`COALESCE(SUM(${weeklyMetrics.orderCount}), 0)`,
        totalAmazonFees: sql<number | null>`SUM(${weeklyMetrics.totalAmazonFees})`,
        promotions: sql<number | null>`SUM(${weeklyMetrics.promotions})`,
        refundAmount: sql<number | null>`SUM(${weeklyMetrics.refundAmount})`,
        totalCogs: sql<number | null>`SUM(${weeklyMetrics.totalCogs})`,
        adSpend: sql<number | null>`SUM(${weeklyMetrics.adSpend})`,
        adSales: sql<number | null>`SUM(${weeklyMetrics.adSales})`,
        organicSales: sql<number | null>`SUM(${weeklyMetrics.organicSales})`,
        netProceeds: sql<number | null>`SUM(${weeklyMetrics.netProceeds})`,
        netProfit: sql<number | null>`SUM(${weeklyMetrics.netProfit})`,
        reimbursement: sql<number | null>`SUM(${weeklyMetrics.reimbursement})`,
      })
      .from(weeklyMetrics)
      .where(eq(weeklyMetrics.channel, "amazon"))
      .groupBy(weeklyMetrics.weekStartDate)
      .orderBy(asc(weeklyMetrics.weekStartDate));

    const result = rows.map((r) => ({
      week: r.week,
      revenue: Number(r.revenue) || 0,
      units: Number(r.units) || 0,
      orders: Number(r.orders) || 0,
      totalAmazonFees: r.totalAmazonFees != null ? Number(r.totalAmazonFees) : null,
      promotions: r.promotions != null ? Number(r.promotions) : null,
      refunds: r.refundAmount != null ? Number(r.refundAmount) : null,
      totalCogs: r.totalCogs != null ? Number(r.totalCogs) : null,
      adSpend: r.adSpend != null ? Number(r.adSpend) : null,
      adSales: r.adSales != null ? Number(r.adSales) : null,
      organicSales: r.organicSales != null ? Number(r.organicSales) : null,
      netProceeds: r.netProceeds != null ? Number(r.netProceeds) : null,
      netProfit: r.netProfit != null ? Number(r.netProfit) : null,
      reimbursement: r.reimbursement != null ? Number(r.reimbursement) : null,
    }));

    res.json(result);
  });

  // ─── GET /api/product-weekly-revenue/:asin — Per-product weekly revenue ──

  app.get("/api/product-weekly-revenue/:asin", async (req, res) => {
    const { asin } = req.params;

    const rows = await db
      .select({
        week: weeklyMetrics.weekStartDate,
        revenue: sql<number>`COALESCE(SUM(${weeklyMetrics.revenue}), 0)`,
      })
      .from(weeklyMetrics)
      .where(and(
        eq(weeklyMetrics.asin, asin),
        eq(weeklyMetrics.channel, "amazon"),
      ))
      .groupBy(weeklyMetrics.weekStartDate)
      .orderBy(asc(weeklyMetrics.weekStartDate));

    const result: Record<string, number> = {};
    for (const r of rows) {
      result[r.week] = Number(r.revenue) || 0;
    }
    res.json(result);
  });

  // ─── GET /api/channel-hero/:channel — Channel-specific hero chart ───────

  app.get("/api/channel-hero/:channel", async (req, res) => {
    const { channel } = req.params;

    const rows = await db
      .select({
        week: weeklyMetrics.weekStartDate,
        revenue: sql<number>`COALESCE(SUM(${weeklyMetrics.revenue}), 0)`,
        units: sql<number>`COALESCE(SUM(${weeklyMetrics.unitsSold}), 0)`,
        orders: sql<number>`COALESCE(SUM(${weeklyMetrics.orderCount}), 0)`,
        netProfit: sql<number | null>`SUM(${weeklyMetrics.netProfit})`,
        totalCogs: sql<number | null>`SUM(${weeklyMetrics.totalCogs})`,
      })
      .from(weeklyMetrics)
      .where(eq(weeklyMetrics.channel, channel))
      .groupBy(weeklyMetrics.weekStartDate)
      .orderBy(asc(weeklyMetrics.weekStartDate));

    const result = rows.slice(-52).map((r) => ({
      week: r.week,
      revenue: Number(r.revenue) || 0,
      units: Number(r.units) || 0,
      orders: Number(r.orders) || 0,
      netProfit: r.netProfit != null ? Number(r.netProfit) : null,
      cogs: r.totalCogs != null ? Number(r.totalCogs) : null,
    }));

    res.json(result);
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
