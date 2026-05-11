import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as {
  __flowchartPostgres?: ReturnType<typeof postgres>;
  __flowchartDb?: DB;
};

// Simple Mock DB to allow UI prototyping without a real Postgres instance.
// It supports basic chainable Drizzle patterns used in the app.
const mockDb = {
  select: () => ({
    from: () => ({
      where: () => ({
        orderBy: () => Promise.resolve([]),
        limit: () => Promise.resolve([]),
        then: (cb: any) => Promise.resolve([]).then(cb),
      }),
      orderBy: () => Promise.resolve([]),
      limit: () => Promise.resolve([]),
      then: (cb: any) => Promise.resolve([]).then(cb),
    }),
  }),
  insert: () => ({
    values: () => Promise.resolve([{ id: "mock-id" }]),
  }),
  update: () => ({
    set: () => ({
      where: () => Promise.resolve(),
    }),
  }),
  delete: () => ({
    where: () => Promise.resolve(),
  }),
} as unknown as DB;

function createSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.warn("DATABASE_URL is missing. Falling back to MOCK_DB mode.");
    return null;
  }
  
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  
  // In dev/test, we want to fail fast if the DB isn't there to trigger the mock fallback.
  return postgres(url, {
    max: 1,
    prepare: false,
    ssl: isLocal ? false : "require",
    connect_timeout: 2, 
  });
}

function ensureDb(): DB {
  if (process.env.MOCK_DB === "true") {
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
      return (...args: any[]) => {
        try {
          const result = value.apply(real, args);
          
          // If the result is a query object with a 'then' method, it might fail later.
          if (result && typeof result.then === "function") {
            return result.catch((err: any) => {
              if (err?.code === "ECONNREFUSED" || err?.message?.includes("connection refused")) {
                console.warn(`DB connection refused for ${String(prop)}. Falling back to mock data.`);
                // Fallback: call the same method on the mockDb
                const mockFunc = (mockDb as any)[prop];
                if (typeof mockFunc === "function") {
                  return mockFunc.apply(mockDb, args);
                }
              }
              throw err;
            });
          }
          return result;
        } catch (err: any) {
          if (err?.code === "ECONNREFUSED" || err?.message?.includes("connection refused")) {
            console.warn(`DB operation ${String(prop)} failed immediately. Falling back to mock.`);
            const mockFunc = (mockDb as any)[prop];
            if (typeof mockFunc === "function") {
              return mockFunc.apply(mockDb, args);
            }
          }
          throw err;
        }
      };
    }
    return value;
  },
});
