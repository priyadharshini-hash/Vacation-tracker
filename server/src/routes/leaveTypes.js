import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM leave_types ORDER BY is_default DESC, name');
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
  const { name, defaultDaysPerYear, isDefault } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (isDefault === true) {
      await client.query('UPDATE leave_types SET is_default = false WHERE id <> $1', [req.params.id]);
    }
    const result = await client.query(
      `UPDATE leave_types
       SET name = COALESCE($1, name),
           default_days_per_year = COALESCE($2, default_days_per_year),
           is_default = COALESCE($3, is_default)
       WHERE id = $4 RETURNING *`,
      [name, defaultDaysPerYear, typeof isDefault === 'boolean' ? isDefault : null, req.params.id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Leave type not found' });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A leave type with that name already exists' });
    }
    throw err;
  } finally {
    client.release();
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM leave_types WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default router;
