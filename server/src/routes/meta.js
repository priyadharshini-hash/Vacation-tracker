import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Departments the caller may filter by: admins see all, everyone else only their own.
router.get('/departments', requireAuth, async (req, res) => {
  if (req.user.role === 'admin') {
    const result = await pool.query(
      `SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department <> '' ORDER BY department`
    );
    return res.json(result.rows.map((r) => r.department));
  }
  const result = await pool.query(
    `SELECT department FROM users WHERE id = $1 AND department IS NOT NULL AND department <> ''`,
    [req.user.id]
  );
  res.json(result.rows.map((r) => r.department));
});

// Locations the caller may filter by: admins see all, others only those of people in their department.
router.get('/locations', requireAuth, async (req, res) => {
  const result =
    req.user.role === 'admin'
      ? await pool.query(`SELECT DISTINCT location FROM users WHERE location IS NOT NULL AND location <> '' ORDER BY location`)
      : await pool.query(
          `SELECT DISTINCT location FROM users
           WHERE location IS NOT NULL AND location <> ''
             AND department IS NOT DISTINCT FROM (SELECT department FROM users WHERE id = $1)
           ORDER BY location`,
          [req.user.id]
        );
  res.json(result.rows.map((r) => r.location));
});

// Number of people in the caller's visible scope (used for "56 of 58 available").
// Same scoping as /requests/calendar: admins may pick a department or 'all'; others are locked to their own.
router.get('/headcount', requireAuth, async (req, res) => {
  const { department } = req.query;
  let result;
  if (req.user.role === 'admin') {
    if (department && department !== 'all') {
      result = await pool.query('SELECT COUNT(*)::int AS n FROM users WHERE department = $1', [department]);
    } else {
      result = await pool.query('SELECT COUNT(*)::int AS n FROM users');
    }
  } else {
    result = await pool.query(
      `SELECT COUNT(*)::int AS n FROM users
       WHERE department IS NOT DISTINCT FROM (SELECT department FROM users WHERE id = $1)`,
      [req.user.id]
    );
  }
  res.json({ count: result.rows[0].n });
});

export default router;
