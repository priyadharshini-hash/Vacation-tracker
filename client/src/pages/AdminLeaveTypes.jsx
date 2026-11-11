import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { PinIcon } from '../components/LeaveTypeSelect.jsx';

const PenIcon = () => (
  <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" strokeLinejoin="round" />
    <path d="M12 5l3 3" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M4 6h12M8 6V4h4v2M6 6l.7 10h6.6L14 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Add / edit window. `lt` is null when adding a new leave type. */
function LeaveTypeDialog({ lt, year, onClose, onSubmit }) {
  const isNew = !lt;
  const [name, setName] = useState(lt?.name ?? '');
  const [days, setDays] = useState(lt ? String(lt.default_days_per_year) : '');
  const [unlimited, setUnlimited] = useState(lt?.is_unlimited ?? false);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter a name.');
    if (!unlimited && (days === '' || Number(days) < 0 || Number(days) > 366)) {
      return setError('Days per year must be a number from 0 to 366.');
    }
    setSaving(true);
    const result = await onSubmit({
      name: name.trim(),
      isUnlimited: unlimited,
      ...(unlimited ? {} : { defaultDaysPerYear: Number(days) }),
      ...(isNew ? {} : { applyToExisting: applyToExisting && !unlimited }),
    });
    setSaving(false);
    if (result !== true) setError(result);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={isNew ? 'Add leave type' : 'Edit leave type'} onSubmit={submit}>
        <div className="modal-head">
          <h3>{isNew ? 'Add leave type' : 'Edit leave type'}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        <label className="field">
          Name
          <input id="lt-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>

        <label className="field">
          Days per year
          <input
            id="lt-days"
            type="number"
            min="0"
            max="366"
            step="0.5"
            value={unlimited ? '' : days}
            placeholder={unlimited ? 'Unlimited' : 'e.g. 10'}
            disabled={unlimited}
            onChange={(e) => setDays(e.target.value)}
          />
        </label>

        <label className="inline-check">
          <input id="lt-unlimited" type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> Unlimited (no yearly limit)
        </label>

        {!isNew && !unlimited && (
          <label className="inline-check apply-check">
            <input id="lt-apply" type="checkbox" checked={applyToExisting} onChange={(e) => setApplyToExisting(e.target.checked)} />
            <span>
              Also set everyone's {year} balance to this number
              <small>Leave unticked to change it only for people added later.</small>
            </span>
          </label>
        )}

        <div className="modal-actions modal-actions-end">
          <button type="button" className="secondary-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDelete({ lt, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-label="Delete leave type">
        <h3>Delete "{lt.name}"?</h3>
        <p className="sub-text">This also deletes every leave request and balance of this type. It cannot be undone.</p>
        <div className="modal-actions modal-actions-end">
          <button className="secondary-outline" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
          >
            {busy ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminLeaveTypes() {
  const { token } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [dialog, setDialog] = useState(null); // null | { lt: object | null }
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  async function load() {
    setLeaveTypes(await api.getLeaveTypes(token));
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err.message);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Returns true on success, or an error message for the dialog to show.
  async function handleSubmit(body) {
    setNotice('');
    try {
      if (dialog.lt) {
        await api.updateLeaveType(token, dialog.lt.id, body);
        setNotice(body.applyToExisting ? `Saved. Everyone's ${year} balance was updated too.` : 'Saved.');
      } else {
        await api.createLeaveType(token, body);
        setNotice('Leave type added.');
      }
      await load();
      setDialog(null);
      return true;
    } catch (err) {
      return err.message;
    }
  }

  async function handlePin(lt) {
    setError('');
    setNotice('');
    try {
      await api.updateLeaveType(token, lt.id, { isDefault: true });
      await load();
      setNotice(`"${lt.name}" is now the default.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    setError('');
    setNotice('');
    try {
      await api.deleteLeaveType(token, deleting.id);
      setNotice(`"${deleting.name}" was deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    }
  }

  if (loading) return <p className="page-loading">Loading...</p>;

  return (
    <div className="page">
      <div className="panel-header">
        <h2 className="panel-title">Leave types</h2>
        <button onClick={() => setDialog({ lt: null })}>+ Add leave type</button>
      </div>
      <p className="muted-small">Use the pen to change a leave type's name or yearly days, or to make it unlimited.</p>

      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-success">{notice}</p>}

      <table className="request-table lt-table">
        <thead>
          <tr>
            <th>Leave type</th>
            <th>Days per year</th>
            <th className="lt-actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leaveTypes.map((lt) => (
            <tr key={lt.id}>
              <td>
                <span className="lt-name">{lt.name}</span>
                {lt.is_default && (
                  <span className="default-pill">
                    <PinIcon size={12} /> Default
                  </span>
                )}
              </td>
              <td>{lt.is_unlimited ? 'Unlimited' : `${Number(lt.default_days_per_year)} days`}</td>
              <td className="lt-actions-col">
                <div className="icon-actions">
                  <button className="icon-btn" title="Edit" aria-label={`Edit ${lt.name}`} onClick={() => setDialog({ lt })}>
                    <PenIcon />
                  </button>
                  {!lt.is_default && (
                    <button className="icon-btn" title="Make default" aria-label={`Make ${lt.name} the default`} onClick={() => handlePin(lt)}>
                      <PinIcon size={17} />
                    </button>
                  )}
                  <button className="icon-btn danger" title="Delete" aria-label={`Delete ${lt.name}`} onClick={() => setDeleting(lt)}>
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {dialog && <LeaveTypeDialog key={dialog.lt?.id ?? 'new'} lt={dialog.lt} year={year} onClose={() => setDialog(null)} onSubmit={handleSubmit} />}
      {deleting && <ConfirmDelete lt={deleting} onCancel={() => setDeleting(null)} onConfirm={handleDelete} />}
    </div>
  );
}
