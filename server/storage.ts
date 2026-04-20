import { type User, type InsertUser, users } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq } from "drizzle-orm";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const rows = await db.insert(users).values(insertUser).returning();
    return rows[0];
  }
}

export const storage = new DatabaseStorage();

export async function runMigrations() {
  const statements = [
    // ── Brands table ──────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS pl_dashboard.brands (
       id SERIAL PRIMARY KEY,
       brand_key TEXT NOT NULL UNIQUE,
       brand_name TEXT NOT NULL,
       platforms TEXT[] DEFAULT '{}',
       is_active BOOLEAN DEFAULT true,
       created_at TIMESTAMP DEFAULT NOW()
     )`,
    // Seed the three Neurogan brands
    `INSERT INTO pl_dashboard.brands (id, brand_key, brand_name, platforms, is_active)
     VALUES
       (1, 'cbd',    'Neurogan CBD',    ARRAY['amazon','shopify_dtc','faire'], true),
       (2, 'health', 'Neurogan Health', ARRAY['shopify_dtc'], true),
       (3, 'pets',   'Neurogan Pets',   ARRAY['shopify_dtc'], true)
     ON CONFLICT (id) DO NOTHING`,
    // Keep the sequence in sync after manual id inserts
    `SELECT setval('pl_dashboard.brands_id_seq', (SELECT MAX(id) FROM pl_dashboard.brands))`,

    // ── Add brand_id columns to existing tables ───────────────────────────
    `ALTER TABLE pl_dashboard.products       ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES pl_dashboard.brands(id)`,
    `ALTER TABLE pl_dashboard.weekly_metrics ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES pl_dashboard.brands(id)`,
    `ALTER TABLE pl_dashboard.cogs_periods   ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES pl_dashboard.brands(id)`,
    `ALTER TABLE pl_dashboard.ad_weekly_summary ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES pl_dashboard.brands(id)`,

    // ── Backfill existing rows to brand_id = 1 (Neurogan CBD) ─────────────
    `UPDATE pl_dashboard.products       SET brand_id = 1 WHERE brand_id IS NULL`,
    `UPDATE pl_dashboard.weekly_metrics SET brand_id = 1 WHERE brand_id IS NULL`,
    `UPDATE pl_dashboard.cogs_periods   SET brand_id = 1 WHERE brand_id IS NULL`,
    `UPDATE pl_dashboard.ad_weekly_summary SET brand_id = 1 WHERE brand_id IS NULL`,

    // ── New tables ────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS pl_dashboard.sku_aliases (
       id SERIAL PRIMARY KEY,
       brand_id INTEGER REFERENCES pl_dashboard.brands(id),
       channel TEXT NOT NULL,
       channel_sku TEXT NOT NULL,
       canonical_sku TEXT NOT NULL,
       notes TEXT,
       created_at TIMESTAMP DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS pl_dashboard.channel_settings (
       id SERIAL PRIMARY KEY,
       brand_id INTEGER REFERENCES pl_dashboard.brands(id),
       channel TEXT NOT NULL,
       setting_key TEXT NOT NULL,
       setting_value TEXT NOT NULL
     )`,

    // ── Indexes ───────────────────────────────────────────────────────────
    `CREATE UNIQUE INDEX IF NOT EXISTS wm_sku_week_channel_idx
       ON pl_dashboard.weekly_metrics (sku, week_start_date, channel)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ad_asin_week_idx
       ON pl_dashboard.ad_weekly_summary (asin, week_start_date)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS products_sku_idx
       ON pl_dashboard.products (sku)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS alias_brand_channel_sku_idx
       ON pl_dashboard.sku_aliases (brand_id, channel, channel_sku)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS cs_brand_channel_key_idx
       ON pl_dashboard.channel_settings (brand_id, channel, setting_key)`,
  ];

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err: any) {
      console.warn(`[db] Migration skipped: ${err.message.slice(0, 120)}`);
    }
  }
  console.log("[db] Migrations applied");
}
