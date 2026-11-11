import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of a Date object,
// so calendar dates aren't shifted by the server's local timezone offset.
pg.types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Hosted databases usually require an encrypted connection: set DATABASE_SSL=true on the host.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export function query(text, params) {
  return pool.query(text, params);
}
