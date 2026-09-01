import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM leave_types ORDER BY name');
  res.json(result.rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, defaultDaysPerYear } = req.body;
  if (!name || defaultDaysPerYear == null) {
    return res.status(400).json({ error: 'name and defaultDaysPerYear are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO leave_types (name, default_days_per_year) VALUES ($1, $2) RETURNING *',
      [name, defaultDaysPerYear]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A leave type with that name already exists' });
    }
    throw err;
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, defaultDaysPerYear } = req.body;
  const result = await pool.query(
    'UPDATE leave_types SET name = COALESCE($1, name), default_days_per_year = COALESCE($2, default_days_per_year) WHERE id = $3 RETURNING *',
    [name, defaultDaysPerYear, req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Leave type not found' });
  }
  res.json(result.rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM leave_types WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default router;
