import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** Landing page after Slack sign-in: picks the token out of the URL fragment and logs in. */
export function SlackCallback() {
  const { user, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');

  useEffect(() => {
    if (token) {
      // Drop the token from the address bar/history right away.
      window.history.replaceState(null, '', window.location.pathname);
      loginWithToken(token);
    } else if (!user) {
      navigate('/login?error=slack_failed', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user) return <Navigate to="/" replace />;
  return <p className="page-loading">Signing you in with Slack...</p>;
}
