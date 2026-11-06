import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createDefaultBalances } from '../lib/balances.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const result = await pool.query(`
    SELECT u.id, u.name, u.email, u.role, u.department, u.location,
           u.manager_id AS "managerId", m.name AS "managerName"
    FROM users u
    LEFT JOIN users m ON m.id = u.manager_id
    ORDER BY u.name
  `);
  res.json(result.rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, managerId, department, location } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, and role are required' });
  }
  if (!['employee', 'manager', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be employee, manager, or admin' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, manager_id, department, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, manager_id AS "managerId", department, location`,
      [name, email, hash, role, managerId || null, department || null, location || null]
    );

    await createDefaultBalances(result.rows[0].id);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    throw err;
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, role, managerId, department, location } = req.body;
  if (role && !['employee', 'manager', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be employee, manager, or admin' });
  }
  // managerId may legitimately be set to null (no manager), so it's only touched
  // when the key is present in the request body, unlike the COALESCE fields below.
  const managerIdProvided = Object.prototype.hasOwnProperty.call(req.body, 'managerId');

  const result = await pool.query(
    `UPDATE users SET
       name = COALESCE($1, name),
       role = COALESCE($2, role),
       manager_id = CASE WHEN $3 THEN $4 ELSE manager_id END,
       department = COALESCE($5, department),
       location = COALESCE($6, location)
     WHERE id = $7
     RETURNING id, name, email, role, manager_id AS "managerId", department, location`,
    [name, role, managerIdProvided, managerId ?? null, department, location, req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(result.rows[0]);
});

router.get('/:id/balances', requireAuth, async (req, res) => {
  const targetId = Number(req.params.id);
  if (req.user.role !== 'admin' && req.user.id !== targetId) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const year = Number(req.query.year) || new Date().getFullYear();
  const result = await pool.query(
    `SELECT lt.id AS "leaveTypeId", lt.name, lt.is_unlimited AS "isUnlimited",
            b.allotted_days AS "allottedDays", b.used_days AS "usedDays"
     FROM leave_types lt
     LEFT JOIN leave_balances b ON b.leave_type_id = lt.id AND b.user_id = $1 AND b.year = $2
     ORDER BY lt.name`,
    [targetId, year]
  );
  res.json(result.rows);
});

router.put('/:id/balances', requireAuth, requireRole('admin'), async (req, res) => {
  const targetId = Number(req.params.id);
  const { leaveTypeId, year, allottedDays } = req.body;
  if (!leaveTypeId || !year || allottedDays == null) {
    return res.status(400).json({ error: 'leaveTypeId, year, and allottedDays are required' });
  }

  const result = await pool.query(
    `INSERT INTO leave_balances (user_id, leave_type_id, year, allotted_days, used_days)
     VALUES ($1, $2, $3, $4, 0)
     ON CONFLICT (user_id, leave_type_id, year)
     DO UPDATE SET allotted_days = $4
     RETURNING *`,
    [targetId, leaveTypeId, year, allottedDays]
  );
  res.json(result.rows[0]);
});

export default router;
