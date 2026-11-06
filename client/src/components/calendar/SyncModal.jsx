import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export function SyncModal({ token, onClose }) {
  const [feedToken, setFeedToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getCalendarToken(token)
      .then((r) => setFeedToken(r.token))
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const url = feedToken ? `${window.location.origin}/api/calendar/feed/${feedToken}.ics` : '';
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically - select the link and copy it manually.');
    }
  }

  async function regenerate() {
    if (!window.confirm('Generate a new link? The current link will stop working in any calendar that uses it.')) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.regenerateCalendarToken(token);
      setFeedToken(r.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Sync with your calendar">
        <div className="modal-head">
          <h3>Sync with your calendar</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="muted-small">
          Subscribe to this private link in Google Calendar, Outlook or Apple Calendar to see your approved leaves and the company
          holidays there. Don't share it: anyone with the link can see your leave dates.
        </p>

        {error && <p className="form-error">{error}</p>}

        <div className="copy-row">
          <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Calendar feed link" />
          <button onClick={copy} disabled={!url}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {isLocal && (
          <p className="modal-note">
            You are on <strong>localhost</strong>, so Google or Outlook cannot reach this link yet. It will work once the app is deployed.
          </p>
        )}

        <ul className="modal-steps">
          <li>
            <strong>Google Calendar:</strong> Other calendars (+) &rarr; From URL &rarr; paste the link.
          </li>
          <li>
            <strong>Outlook:</strong> Add calendar &rarr; Subscribe from web &rarr; paste the link.
          </li>
          <li>
            <strong>Apple Calendar:</strong> File &rarr; New Calendar Subscription &rarr; paste the link.
          </li>
        </ul>

        <div className="modal-actions">
          <button className="secondary" onClick={regenerate} disabled={busy || !feedToken}>
            Generate a new link
          </button>
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
