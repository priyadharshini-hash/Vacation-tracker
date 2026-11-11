import { pool } from '../db.js';

/** Give a user a current-year balance row for every leave type (existing rows are kept). */
export async function createDefaultBalances(userId, year = new Date().getFullYear()) {
  await pool.query(
    `INSERT INTO leave_balances (user_id, leave_type_id, year, allotted_days, used_days)
     SELECT $1, id, $2, default_days_per_year, 0 FROM leave_types
     ON CONFLICT (user_id, leave_type_id, year) DO NOTHING`,
    [userId, year]
  );
}
