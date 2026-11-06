import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { createDefaultBalances } from '../lib/balances.js';
import { appUrl, buildAuthorizeUrl, fetchSlackIdentity, slackConfigured, slackTeamId } from '../lib/slack.js';

const router = Router();

const STATE_COOKIE = 'slack_oauth_state';
const STATE_COOKIE_PATH = '/api/auth/slack';

function issueToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, managerId: user.manager_id },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function stateCookie(value, maxAgeSeconds) {
  const secure = appUrl().startsWith('https://') ? '; Secure' : '';
  return `${STATE_COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=${STATE_COOKIE_PATH}; Max-Age=${maxAgeSeconds}${secure}`;
}

function loginRedirect(res, errorCode) {
  res.redirect(`${appUrl()}/login?error=${encodeURIComponent(errorCode)}`);
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({
    token: issueToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, managerId: user.manager_id },
  });
});

// Which sign-in methods the login page should offer.
router.get('/providers', (req, res) => {
  res.json({ slack: slackConfigured() });
});

// Step 1: send the browser to Slack.
router.get('/slack', (req, res) => {
  if (!slackConfigured()) return loginRedirect(res, 'slack_not_configured');
  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', stateCookie(state, 600));
  res.redirect(buildAuthorizeUrl(state));
});

// Step 2: Slack sends the browser back here with ?code=...&state=...
router.get('/slack/callback', async (req, res) => {
  const expectedState = readCookie(req, STATE_COOKIE);
  res.setHeader('Set-Cookie', stateCookie('', 0)); // one-time use

  if (!slackConfigured()) return loginRedirect(res, 'slack_not_configured');
  if (req.query.error) return loginRedirect(res, 'slack_denied');
  const { code, state } = req.query;
  if (!code || !state || !expectedState || state !== expectedState) {
    return loginRedirect(res, 'slack_state');
  }

  try {
    const identity = await fetchSlackIdentity(String(code));
    if (!identity.email || !identity.emailVerified) return loginRedirect(res, 'slack_unverified_email');

    const requiredTeam = slackTeamId();
    if (requiredTeam && identity.teamId !== requiredTeam) return loginRedirect(res, 'slack_wrong_workspace');

    const found = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [identity.email]);
    let user = found.rows[0];

    if (!user) {
      // Only auto-create accounts when sign-in is restricted to our own workspace.
      if (!requiredTeam) return loginRedirect(res, 'slack_no_account');
      const name = identity.name || identity.email.split('@')[0];
      const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const created = await pool.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'employee')
         ON CONFLICT DO NOTHING RETURNING *`,
        [name, identity.email, placeholderHash]
      );
      user = created.rows[0];
      if (!user) {
        const again = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [identity.email]);
        user = again.rows[0];
      } else {
        await createDefaultBalances(user.id);
      }
    }
    if (!user) return loginRedirect(res, 'slack_failed');

    // The token travels in the URL fragment so it is never sent to a server or written to access logs.
    res.redirect(`${appUrl()}/auth/slack#token=${issueToken(user)}`);
  } catch (err) {
    console.error('Slack sign-in failed:', err.message);
    loginRedirect(res, 'slack_failed');
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.department, u.location, u.created_at AS "createdAt",
            u.manager_id AS "managerId", m.name AS "managerName"
     FROM users u
     LEFT JOIN users m ON m.id = u.manager_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  res.json({ user: result.rows[0] });
});

export default router;
