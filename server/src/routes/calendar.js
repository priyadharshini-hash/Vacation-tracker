import crypto from 'node:crypto';
import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Current feed token for the signed-in user (created on first use).
router.get('/token', requireAuth, async (req, res) => {
  const existing = await pool.query('SELECT calendar_token FROM users WHERE id = $1', [req.user.id]);
  let token = existing.rows[0]?.calendar_token;
  if (!token) {
    token = newToken();
    await pool.query('UPDATE users SET calendar_token = $1 WHERE id = $2', [token, req.user.id]);
  }
  res.json({ token });
});

// Replace the token; the old subscription URL stops working immediately.
router.post('/token/regenerate', requireAuth, async (req, res) => {
  const token = newToken();
  await pool.query('UPDATE users SET calendar_token = $1 WHERE id = $2', [token, req.user.id]);
  res.json({ token });
});

const escapeText = (s) =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

const compact = (iso) => iso.replace(/-/g, '');

function dayAfter(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

// Public iCalendar feed (no JWT: calendar apps cannot send one). The secret token identifies the user.
router.get('/feed/:token.ics', async (req, res) => {
  const userResult = await pool.query('SELECT id, name FROM users WHERE calendar_token = $1', [req.params.token]);
  const user = userResult.rows[0];
  if (!user) {
    return res.status(404).type('text/plain').send('Calendar not found');
  }

  const [leaves, holidays] = await Promise.all([
    pool.query(
      `SELECT r.id, r.start_date AS "startDate", r.end_date AS "endDate", lt.name AS "typeName"
       FROM leave_requests r JOIN leave_types lt ON lt.id = r.leave_type_id
       WHERE r.user_id = $1 AND r.status = 'approved'
       ORDER BY r.start_date`,
      [user.id]
    ),
    pool.query('SELECT id, name, date FROM holidays ORDER BY date'),
  ]);

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Numrah//Vacation Tracker//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText('Numrah Vacation Tracker')}`,
  ];

  for (const l of leaves.rows) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:leave-${l.id}@numrah-vacation-tracker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(l.startDate)}`,
      `DTEND;VALUE=DATE:${dayAfter(l.endDate)}`,
      `SUMMARY:${escapeText(`${l.typeName} (${user.name})`)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    );
  }
  for (const h of holidays.rows) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:holiday-${h.id}@numrah-vacation-tracker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(h.date)}`,
      `DTEND;VALUE=DATE:${dayAfter(h.date)}`,
      `SUMMARY:${escapeText(h.name)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');

  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(lines.join('\r\n') + '\r\n');
});

export default router;
