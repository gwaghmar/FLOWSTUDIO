import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as {
  __flowchartPostgres?: ReturnType<typeof postgres>;
  __flowchartDb?: DB;
};

function createSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is required (e.g. Supabase Postgres or local postgresql://…)",
    );
  }
  const isLocal =
    url.includes("localhost") || url.includes("127.0.0.1");
  return postgres(url, {
    max: 1,
    prepare: false,
    ssl: isLocal ? false : "require",
  });
}

function ensureDb(): DB {
  if (!g.__flowchartDb) {
    if (!g.__flowchartPostgres) {
      g.__flowchartPostgres = createSql();
    }
    g.__flowchartDb = drizzle(g.__flowchartPostgres, { schema });
  }
  return g.__flowchartDb;
}

/** Lazy Postgres client so `next build` can run before DATABASE_URL exists in the environment. */
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = ensureDb();
    const value = Reflect.get(real as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(real);
    }
    return value;
  },
});
