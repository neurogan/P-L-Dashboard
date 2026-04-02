/**
 * QuickBooks Online Ingestion Module
 *
 * Pulls COGS data from QuickBooks Online API (Items list with cost data),
 * maps by SKU, and upserts into cogs_periods table.
 *
 * Required env vars:
 *   QBO_CLIENT_ID
 *   QBO_CLIENT_SECRET
 *   QBO_REFRESH_TOKEN
 *   QBO_REALM_ID
 */
import { db } from "../storage";
import { cogsPeriods } from "@shared/schema";
import { sql } from "drizzle-orm";

const QBO_BASE_URL = "https://quickbooks.api.intuit.com";

/**
 * Refresh the QBO access token
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.QBO_CLIENT_ID!;
  const clientSecret = process.env.QBO_CLIENT_SECRET!;
  const refreshToken = process.env.QBO_REFRESH_TOKEN!;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(`QBO auth failed: ${JSON.stringify(data)}`);

  // TODO: Store the new refresh_token (data.refresh_token) for next time
  // QBO refresh tokens rotate on each use
  return data.access_token;
}

/**
 * Query QuickBooks for Items with cost data
 */
async function queryItems(accessToken: string): Promise<any[]> {
  const realmId = process.env.QBO_REALM_ID!;
  const query = encodeURIComponent(
    "SELECT * FROM Item WHERE Type = 'Inventory' MAXRESULTS 1000"
  );

  const res = await fetch(
    `${QBO_BASE_URL}/v3/company/${realmId}/query?query=${query}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBO query failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data?.QueryResponse?.Item || [];
}

/**
 * Pull COGS data from QuickBooks and upsert into cogs_periods
 */
export async function syncQuickBooksCogs() {
  const requiredVars = ["QBO_CLIENT_ID", "QBO_CLIENT_SECRET", "QBO_REFRESH_TOKEN", "QBO_REALM_ID"];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    return { status: "skipped", reason: `Missing env vars: ${missing.join(", ")}` };
  }

  console.log("[QuickBooks] Syncing COGS data");
  const accessToken = await getAccessToken();
  const items = await queryItems(accessToken);

  let updated = 0;
  const errors: string[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const item of items) {
    // Map QBO Item to our SKU
    // QBO items may have SKU in the Sku field or Name field
    const sku = item.Sku || item.Name;
    if (!sku) continue;

    const unitCost = item.PurchaseCost || item.UnitPrice || 0;

    try {
      // Upsert as a new COGS period starting today
      // In practice, you'd map to proper date periods
      await db.insert(cogsPeriods).values({
        sku,
        startsDate: today,
        endsDate: null,
        productCost: unitCost,
        shippingCost: 0, // QuickBooks doesn't typically break out shipping per unit
        tariffs: 0,
        totalCogs: unitCost,
      });
      updated++;
    } catch (err: any) {
      errors.push(`${sku}: ${err.message}`);
    }
  }

  console.log(`[QuickBooks] Done: ${updated} COGS rows, ${errors.length} errors`);
  return { status: "completed", updated, errors };
}
