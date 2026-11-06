import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function daysBetweenInclusive(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

router.get('/mine', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT r.id, r.leave_type_id AS "leaveTypeId", lt.name AS "leaveTypeName",
            r.start_date AS "startDate", r.end_date AS "endDate", r.days_requested AS "daysRequested",
            r.status, r.reason, r.created_at AS "createdAt"
     FROM leave_requests r
     JOIN leave_types lt ON lt.id = r.leave_type_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { leaveTypeId, startDate, endDate, reason } = req.body;
  if (!leaveTypeId || !startDate || !endDate) {
    return res.status(400).json({ error: 'leaveTypeId, startDate, and endDate are required' });
  }
  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ error: 'endDate must be on or after startDate' });
  }

  const daysRequested = daysBetweenInclusive(startDate, endDate);
  const year = new Date(startDate).getFullYear();

  const balanceResult = await pool.query(
    `SELECT allotted_days AS "allottedDays", used_days AS "usedDays"
     FROM leave_balances WHERE user_id = $1 AND leave_type_id = $2 AND year = $3`,
    [req.user.id, leaveTypeId, year]
  );
  const balance = balanceResult.rows[0] || { allottedDays: 0, usedDays: 0 };
  const remaining = Number(balance.allottedDays) - Number(balance.usedDays);
  if (daysRequested > remaining) {
    return res.status(400).json({
      error: `Insufficient balance: requested ${daysRequested} day(s), ${remaining} day(s) remaining`,
    });
  }

  const result = await pool.query(
    `INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, days_requested, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, leave_type_id AS "leaveTypeId", start_date AS "startDate", end_date AS "endDate",
               days_requested AS "daysRequested", status, reason, created_at AS "createdAt"`,
    [req.user.id, leaveTypeId, startDate, endDate, daysRequested, reason || null]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/calendar', requireAuth, async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end query params are required' });
  }

  // department / location may be repeated query params (multi-select filters); 'all' means no filter.
  const listParam = (value) => [].concat(value || []).map(String).filter((v) => v && v !== 'all');
  const departments = listParam(req.query.department);
  const locations = listParam(req.query.location);

  const params = [start, end];
  let filterClause = '';

  if (req.user.role === 'admin') {
    if (departments.length > 0) {
      params.push(departments);
      filterClause += ` AND u.department = ANY($${params.length}::text[])`;
    }
  } else {
    // Non-admins only ever see their own department.
    params.push(req.user.id);
    filterClause += ` AND u.department IS NOT DISTINCT FROM (SELECT department FROM users WHERE id = $${params.length})`;
  }
  if (locations.length > 0) {
    params.push(locations);
    filterClause += ` AND u.location = ANY($${params.length}::text[])`;
  }

  const result = await pool.query(
    `SELECT r.id, r.user_id AS "userId", u.name AS "userName", u.department, u.location,
            r.leave_type_id AS "leaveTypeId",
            lt.name AS "leaveTypeName", r.start_date AS "startDate", r.end_date AS "endDate", r.status
     FROM leave_requests r
     JOIN users u ON u.id = r.user_id
     JOIN leave_types lt ON lt.id = r.leave_type_id
     WHERE r.status = 'approved' AND r.start_date <= $2 AND r.end_date >= $1 ${filterClause}
     ORDER BY r.start_date, u.name`,
    params
  );
  res.json(result.rows);
});

router.get('/team', requireAuth, requireRole('manager', 'admin'), async (req, res) => {
  const params = [];
  let whereClause = "r.status = 'pending'";
  if (req.user.role === 'manager') {
    params.push(req.user.id);
    whereClause += ` AND u.manager_id = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT r.id, r.user_id AS "userId", u.name AS "userName", r.leave_type_id AS "leaveTypeId",
            lt.name AS "leaveTypeName", r.start_date AS "startDate", r.end_date AS "endDate",
            r.days_requested AS "daysRequested", r.status, r.reason, r.created_at AS "createdAt"
     FROM leave_requests r
     JOIN users u ON u.id = r.user_id
     JOIN leave_types lt ON lt.id = r.leave_type_id
     WHERE ${whereClause}
     ORDER BY r.created_at ASC`,
    params
  );
  res.json(result.rows);
});

router.put('/:id/decide', requireAuth, requireRole('manager', 'admin'), async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reqResult = await client.query(
      `SELECT r.*, u.manager_id AS "managerId"
       FROM leave_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1
       FOR UPDATE`,
      [req.params.id]
    );
    const request = reqResult.rows[0];
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Request has already been decided' });
    }
    if (req.user.role === 'manager' && request.managerId !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You can only decide requests for your direct reports' });
    }

    if (status === 'approved') {
      const year = new Date(request.start_date).getFullYear();
      const balanceResult = await client.query(
        `SELECT allotted_days AS "allottedDays", used_days AS "usedDays"
         FROM leave_balances WHERE user_id = $1 AND leave_type_id = $2 AND year = $3
         FOR UPDATE`,
        [request.user_id, request.leave_type_id, year]
      );
      const balance = balanceResult.rows[0] || { allottedDays: 0, usedDays: 0 };
      const remaining = Number(balance.allottedDays) - Number(balance.usedDays);
      if (Number(request.days_requested) > remaining) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Cannot approve: only ${remaining} day(s) remaining for this employee`,
        });
      }

      await client.query(
        `UPDATE leave_balances SET used_days = used_days + $1
         WHERE user_id = $2 AND leave_type_id = $3 AND year = $4`,
        [request.days_requested, request.user_id, request.leave_type_id, year]
      );
    }

    const updated = await client.query(
      `UPDATE leave_requests
       SET status = $1, decided_by = $2, decided_at = now()
       WHERE id = $3
       RETURNING id, user_id AS "userId", leave_type_id AS "leaveTypeId", start_date AS "startDate",
                 end_date AS "endDate", days_requested AS "daysRequested", status, reason,
                 decided_by AS "decidedBy", decided_at AS "decidedAt"`,
      [status, req.user.id, req.params.id]
    );

    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export default router;
