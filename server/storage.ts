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
    `CREATE UNIQUE INDEX IF NOT EXISTS wm_sku_week_channel_idx
       ON pl_dashboard.weekly_metrics (sku, week_start_date, channel)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ad_asin_week_idx
       ON pl_dashboard.ad_weekly_summary (asin, week_start_date)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS products_sku_idx
       ON pl_dashboard.products (sku)`,
  ];
  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      console.warn(`[db] Migration skipped: ${err.message}`);
    }
  }
  console.log("[db] Migrations applied");
}
