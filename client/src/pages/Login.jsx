import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

const SLACK_ERRORS = {
  slack_not_configured: 'Sign in with Slack is not set up yet. Please use your email and password.',
  slack_denied: 'Slack sign-in was cancelled.',
  slack_state: 'The Slack sign-in expired or could not be verified. Please try again.',
  slack_failed: 'Something went wrong signing in with Slack. Please try again.',
  slack_unverified_email: 'Your Slack email address is not verified.',
  slack_wrong_workspace: "You're not in the Numrah Slack workspace, so you can't sign in with Slack.",
  slack_no_account: 'No Leaves Tracker account matches your Slack email. Ask an admin to add you.',
};

function SlackLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#E01E5A" d="M5.04 15.16a2.52 2.52 0 1 1-2.52-2.52h2.52v2.52zm1.27 0a2.52 2.52 0 1 1 5.04 0v6.32a2.52 2.52 0 1 1-5.04 0v-6.32z" />
      <path fill="#36C5F0" d="M8.83 5.04a2.52 2.52 0 1 1 2.52-2.52v2.52H8.83zm0 1.27a2.52 2.52 0 1 1 0 5.04H2.52a2.52 2.52 0 1 1 0-5.04h6.31z" />
      <path fill="#2EB67D" d="M18.96 8.83a2.52 2.52 0 1 1 2.52 2.52h-2.52V8.83zm-1.27 0a2.52 2.52 0 1 1-5.04 0V2.52a2.52 2.52 0 1 1 5.04 0v6.31z" />
      <path fill="#ECB22E" d="M15.17 18.96a2.52 2.52 0 1 1-2.52 2.52v-2.52h2.52zm0-1.27a2.52 2.52 0 1 1 0-5.04h6.31a2.52 2.52 0 1 1 0 5.04h-6.31z" />
    </svg>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => SLACK_ERRORS[searchParams.get('error')] || '');
  const [submitting, setSubmitting] = useState(false);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  // Slack comes first; the email form opens on request (or via /login?email=1, handy for the admin account).
  const [showEmail, setShowEmail] = useState(() => searchParams.get('email') === '1');

  useEffect(() => {
    api
      .getAuthProviders()
      .then((p) => setSlackEnabled(Boolean(p?.slack)))
      .catch(() => setSlackEnabled(false))
      .finally(() => setProvidersLoaded(true));
  }, []);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const emailFormVisible = providersLoaded && (!slackEnabled || showEmail);
  const slackFirst = providersLoaded && slackEnabled;

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Numrah Leaves Tracker</h1>
        {slackFirst && <p className="login-sub">Sign in with your Numrah Slack account.</p>}
        {error && <p className="form-error">{error}</p>}

        {slackFirst && (
          <a className="slack-btn slack-btn-primary" href="/api/auth/slack">
            <SlackLogo /> Sign in with Slack
          </a>
        )}

        {slackFirst && !showEmail && (
          <button type="button" className="link-btn" onClick={() => setShowEmail(true)}>
            Use email and password instead
          </button>
        )}

        {slackFirst && showEmail && (
          <div className="login-divider">
            <span>or use email</span>
          </div>
        )}

        {emailFormVisible && (
          <>
            <label>
              Email
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
