import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const result = await pool.query(
    `SELECT id, name, date FROM holidays WHERE EXTRACT(YEAR FROM date) = $1 ORDER BY date`,
    [year]
  );
  res.json(result.rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, date } = req.body;
  if (!name || !date) {
    return res.status(400).json({ error: 'name and date are required' });
  }
  const result = await pool.query(
    'INSERT INTO holidays (name, date) VALUES ($1, $2) RETURNING id, name, date',
    [name, date]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, date } = req.body;
  const result = await pool.query(
    'UPDATE holidays SET name = COALESCE($1, name), date = COALESCE($2, date) WHERE id = $3 RETURNING id, name, date',
    [name, date, req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Holiday not found' });
  }
  res.json(result.rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM holidays WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default router;
