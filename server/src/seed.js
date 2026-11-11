import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

dotenv.config();

const DEFAULT_PASSWORD = 'Admin123!';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@numrah.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || DEFAULT_PASSWORD;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function run() {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
  if (existing.rows.length > 0) {
    console.log(`Admin user ${ADMIN_EMAIL} already exists, skipping.`);
  } else if (IS_PRODUCTION && (!process.env.SEED_ADMIN_PASSWORD || ADMIN_PASSWORD === DEFAULT_PASSWORD)) {
    // Never create an admin with the well-known default password on a live site.
    console.warn('Skipping admin creation: set SEED_ADMIN_EMAIL and a strong SEED_ADMIN_PASSWORD (not the default) in production.');
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
      ['Admin', ADMIN_EMAIL, hash]
    );
    // The password is only echoed for local development, never into production logs.
    console.log(IS_PRODUCTION ? `Seeded admin user: ${ADMIN_EMAIL}` : `Seeded admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  const leaveTypes = [
    { name: 'Personal Leave', default_days_per_year: 10, is_unlimited: false },
    { name: 'Sick Leave', default_days_per_year: 0, is_unlimited: true },
    { name: 'Travel Work Leave', default_days_per_year: 10, is_unlimited: false },
  ];

  for (const lt of leaveTypes) {
    const existingType = await pool.query('SELECT id FROM leave_types WHERE name = $1', [lt.name]);
    if (existingType.rows.length === 0) {
      await pool.query(
        'INSERT INTO leave_types (name, default_days_per_year, is_unlimited) VALUES ($1, $2, $3)',
        [lt.name, lt.default_days_per_year, lt.is_unlimited]
      );
      console.log(`Seeded leave type: ${lt.name}`);
    }
  }

  await pool.query(
    `UPDATE leave_types SET is_default = true
     WHERE name = 'Personal Leave' AND NOT EXISTS (SELECT 1 FROM leave_types WHERE is_default = true)`
  );

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
