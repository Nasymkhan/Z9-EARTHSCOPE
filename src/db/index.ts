import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & {
  __z9earthscopePool?: Pool;
  __z9earthscopeDb?: NodePgDatabase<typeof schema>;
};

/** Lazily created pool — importing this module never connects. */
export function getPool(): Pool {
  if (!globalForDb.__z9earthscopePool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured.");
    }
    globalForDb.__z9earthscopePool = new Pool({
      connectionString: databaseUrl,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 6_000,
    });
  }
  return globalForDb.__z9earthscopePool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!globalForDb.__z9earthscopeDb) {
    globalForDb.__z9earthscopeDb = drizzle(getPool(), { schema });
  }
  return globalForDb.__z9earthscopeDb;
}

/** Back-compat named export used by legacy call sites — resolved lazily via getter. */
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
}) as NodePgDatabase<typeof schema>;
