import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const MAX_DAYS = 366;

function validDays(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= MAX_DAYS;
}

router.get('/', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM leave_types ORDER BY is_default DESC, name');
  res.json(result.rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, defaultDaysPerYear, isUnlimited } = req.body;
  const unlimited = isUnlimited === true;
  if (!name || (!unlimited && defaultDaysPerYear == null)) {
    return res.status(400).json({ error: 'name and defaultDaysPerYear are required' });
  }
  const days = unlimited ? 0 : defaultDaysPerYear;
  if (!validDays(days)) {
    return res.status(400).json({ error: `defaultDaysPerYear must be a number between 0 and ${MAX_DAYS}` });
  }
  try {
    const result = await pool.query(
      'INSERT INTO leave_types (name, default_days_per_year, is_unlimited) VALUES ($1, $2, $3) RETURNING *',
      [name, days, unlimited]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A leave type with that name already exists' });
    }
    throw err;
  }
});

// Edit a leave type. `applyToExisting` also rewrites everyone's current-year allowance to the new default.
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, defaultDaysPerYear, isDefault, isUnlimited, applyToExisting } = req.body;
  if (defaultDaysPerYear != null && !validDays(defaultDaysPerYear)) {
    return res.status(400).json({ error: `defaultDaysPerYear must be a number between 0 and ${MAX_DAYS}` });
  }
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
           is_default = COALESCE($3, is_default),
           is_unlimited = COALESCE($4, is_unlimited)
       WHERE id = $5 RETURNING *`,
      [
        name,
        defaultDaysPerYear ?? null,
        typeof isDefault === 'boolean' ? isDefault : null,
        typeof isUnlimited === 'boolean' ? isUnlimited : null,
        req.params.id,
      ]
    );
    const updated = result.rows[0];
    if (!updated) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Leave type not found' });
    }
    if (applyToExisting === true && !updated.is_unlimited) {
      await client.query(
        `UPDATE leave_balances SET allotted_days = $1
         WHERE leave_type_id = $2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)::int`,
        [updated.default_days_per_year, updated.id]
      );
    }
    await client.query('COMMIT');
    res.json(updated);
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
