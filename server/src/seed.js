import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

dotenv.config();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@numrah.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

async function run() {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
      ['Admin', ADMIN_EMAIL, hash]
    );
    console.log(`Seeded admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`Admin user ${ADMIN_EMAIL} already exists, skipping.`);
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
