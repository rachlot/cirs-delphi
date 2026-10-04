import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __cirsDelphiPool: Pool | undefined;
}

const pool =
  global.__cirsDelphiPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Serverless (Netlify Functions): jede Instanz hält nur wenige Verbindungen,
    // sonst ist das Verbindungslimit der Datenbank schnell erschöpft.
    max: process.env.NODE_ENV === "production" ? 3 : 10,
    idleTimeoutMillis: 10_000,
  });

global.__cirsDelphiPool = pool;

export const db = drizzle(pool, { schema });
