// "Sign in with Slack" (OpenID Connect). Configuration is read lazily because dotenv runs after imports.

const DEFAULT_BASE = 'https://slack.com';

function config() {
  return {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    teamId: process.env.SLACK_TEAM_ID || '',
    base: (process.env.SLACK_BASE_URL || DEFAULT_BASE).replace(/\/$/, ''),
    appUrl: (process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, ''),
  };
}

export function appUrl() {
  return config().appUrl;
}

export function slackConfigured() {
  const { clientId, clientSecret } = config();
  return Boolean(clientId && clientSecret);
}

/** Workspace restriction (also enables auto-creating accounts for people in that workspace). */
export function slackTeamId() {
  return config().teamId;
}

export function redirectUri() {
  return `${config().appUrl}/api/auth/slack/callback`;
}

export function buildAuthorizeUrl(state) {
  const { clientId, teamId, base } = config();
  const params = new URLSearchParams({
    response_type: 'code',
    scope: 'openid email profile',
    client_id: clientId,
    redirect_uri: redirectUri(),
    state,
  });
  if (teamId) params.set('team', teamId);
  return `${base}/openid/connect/authorize?${params}`;
}

async function slackJson(url, options) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  const data = await res.json().catch(() => null);
  if (!data || data.ok === false) {
    throw new Error(`Slack error: ${data?.error || res.status}`);
  }
  return data;
}

/** Exchange an authorization code and return the signed-in person's verified Slack identity. */
export async function fetchSlackIdentity(code) {
  const { clientId, clientSecret, base } = config();
  const token = await slackJson(`${base}/api/openid.connect.token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  const info = await slackJson(`${base}/api/openid.connect.userInfo`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  return {
    email: info.email ? String(info.email).trim() : '',
    emailVerified: info.email_verified !== false,
    name: info.name || [info.given_name, info.family_name].filter(Boolean).join(' ') || '',
    teamId: info['https://slack.com/team_id'] || '',
  };
}
