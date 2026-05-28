import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { isConnectionRefusedError, isMockDbEnabled } from "./mode";

type DB = PostgresJsDatabase<typeof schema>;
type PromiseThen = Parameters<Promise<unknown[]>["then"]>[0];
type DbCallable = (...args: unknown[]) => unknown;

const g = globalThis as unknown as {
  __flowchartPostgres?: ReturnType<typeof postgres>;
  __flowchartDb?: DB;
};

// Simple Mock DB to allow UI prototyping without a real Postgres instance.
// It supports basic chainable Drizzle patterns used in the app.
function mockRowsQuery(rows: unknown[] = []) {
  const query = Promise.resolve(rows);
  return Object.assign(query, {
    orderBy: () => Promise.resolve(rows),
    limit: () => Promise.resolve(rows),
    returning: () => Promise.resolve(rows),
  });
}

const mockDb = {
  select: () => ({
    from: () => ({
      where: () => ({
        orderBy: () => Promise.resolve([]),
        limit: () => Promise.resolve([]),
        then: (cb: PromiseThen) => Promise.resolve([]).then(cb),
      }),
      orderBy: () => Promise.resolve([]),
      limit: () => Promise.resolve([]),
      then: (cb: PromiseThen) => Promise.resolve([]).then(cb),
    }),
  }),
  insert: () => ({
    values: () => mockRowsQuery([{ id: "mock-id" }]),
  }),
  update: () => ({
    set: () => ({
      where: () => mockRowsQuery([{ id: "mock-id" }]),
    }),
  }),
  delete: () => ({
    where: () => Promise.resolve(),
  }),
} as unknown as DB;

function createSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    if (isMockDbEnabled()) {
      console.warn("DATABASE_URL is missing. Falling back to MOCK_DB mode.");
      return null;
    }
    throw new Error("DATABASE_URL is required unless MOCK_DB is enabled.");
  }
  
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");

  // In dev/test, we want to fail fast if the DB isn't there to trigger the mock fallback.
  // In production, raise pool size to handle concurrent requests efficiently.
  return postgres(url, {
    max: isLocal ? 1 : 10,
    prepare: false,
    ssl: isLocal ? false : "require",
    connect_timeout: isLocal ? 2 : 10,
  });
}

function ensureDb(): DB {
  if (isMockDbEnabled()) {
    return mockDb;
  }
  if (!g.__flowchartDb) {
    const sql = createSql();
    if (!sql) {
      g.__flowchartDb = mockDb;
    } else {
      g.__flowchartPostgres = sql;
      g.__flowchartDb = drizzle(sql, { schema });
    }
  }
  return g.__flowchartDb!;
}

/** 
 * Lazy Postgres client so `next build` can run before DATABASE_URL exists.
 * In development, if the connection fails, it will throw an error on the first query.
 * The Proxy handles catching those errors and falling back to a mock implementation.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = ensureDb();
    const value = Reflect.get(real as object, prop, receiver);
    
    if (typeof value === "function") {
      const fn = value as DbCallable;
      return (...args: unknown[]) => {
        try {
          const result = fn.apply(real, args);
          
          // If the result is a query object with a 'then' method, it might fail later.
          if (result instanceof Promise) {
            return result.catch((err: unknown) => {
              if (isMockDbEnabled() && isConnectionRefusedError(err)) {
                console.warn(`DB connection refused for ${String(prop)}. Falling back to mock data.`);
                // Fallback: call the same method on the mockDb
                const mockFunc = (mockDb as unknown as Record<PropertyKey, unknown>)[prop];
                if (typeof mockFunc === "function") {
                  return (mockFunc as DbCallable).apply(mockDb, args);
                }
              }
              throw err;
            });
          }
          return result;
        } catch (err: unknown) {
          if (isMockDbEnabled() && isConnectionRefusedError(err)) {
            console.warn(`DB operation ${String(prop)} failed immediately. Falling back to mock.`);
            const mockFunc = (mockDb as unknown as Record<PropertyKey, unknown>)[prop];
            if (typeof mockFunc === "function") {
              return (mockFunc as DbCallable).apply(mockDb, args);
            }
          }
          throw err;
        }
      };
    }
    return value;
  },
});
