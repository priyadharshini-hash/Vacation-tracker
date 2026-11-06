import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { PinIcon } from '../components/LeaveTypeSelect.jsx';

function LeaveTypeRow({ lt, onSave, onPin, onDelete, year }) {
  const [name, setName] = useState(lt.name);
  const [days, setDays] = useState(String(lt.default_days_per_year));
  const [unlimited, setUnlimited] = useState(lt.is_unlimited);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [saving, setSaving] = useState(false);

  const daysValid = unlimited || (days !== '' && Number(days) >= 0);
  const dirty = name !== lt.name || unlimited !== lt.is_unlimited || (!unlimited && Number(days) !== Number(lt.default_days_per_year));

  async function save() {
    setSaving(true);
    const ok = await onSave(lt.id, {
      name: name.trim(),
      isUnlimited: unlimited,
      ...(unlimited ? {} : { defaultDaysPerYear: Number(days) }),
      applyToExisting: applyToExisting && !unlimited,
    });
    setSaving(false);
    if (ok) setApplyToExisting(false);
  }

  return (
    <tr>
      <td>
        <span className="lt-name-cell">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Leave type name" />
          {lt.is_default && <PinIcon />}
        </span>
      </td>
      <td>
        <input
          type="number"
          min="0"
          max="366"
          step="0.5"
          className="lt-days-input"
          value={unlimited ? '' : days}
          placeholder={unlimited ? 'Unlimited' : ''}
          disabled={unlimited}
          onChange={(e) => setDays(e.target.value)}
          aria-label="Days per year"
        />
      </td>
      <td>
        <label className="inline-check">
          <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> Unlimited
        </label>
      </td>
      <td>
        <label className="inline-check" title={`Also set everyone's ${year} allowance to this number`}>
          <input
            type="checkbox"
            checked={applyToExisting}
            disabled={unlimited}
            onChange={(e) => setApplyToExisting(e.target.checked)}
          />{' '}
          Apply to everyone's {year} balance
        </label>
      </td>
      <td className="lt-actions">
        <button onClick={save} disabled={!dirty || !daysValid || !name.trim() || saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {!lt.is_default && (
          <button className="secondary" onClick={() => onPin(lt.id)}>
            Pin as default
          </button>
        )}
        <button className="secondary" onClick={() => onDelete(lt)}>
          Delete
        </button>
      </td>
    </tr>
  );
}

export function AdminLeaveTypes() {
  const { token } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [name, setName] = useState('');
  const [defaultDays, setDefaultDays] = useState('');
  const [newUnlimited, setNewUnlimited] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  async function load() {
    setLoading(true);
    setLeaveTypes(await api.getLeaveTypes(token));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api.createLeaveType(token, {
        name,
        isUnlimited: newUnlimited,
        ...(newUnlimited ? {} : { defaultDaysPerYear: Number(defaultDays) }),
      });
      setName('');
      setDefaultDays('');
      setNewUnlimited(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSave(id, body) {
    setError('');
    setNotice('');
    try {
      await api.updateLeaveType(token, id, body);
      await load();
      setNotice(body.applyToExisting ? `Saved. Everyone's ${year} allowance was updated too.` : 'Saved.');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function handlePin(id) {
    setError('');
    setNotice('');
    try {
      await api.updateLeaveType(token, id, { isDefault: true });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(lt) {
    if (!window.confirm(`Delete "${lt.name}"? This also deletes every leave request and balance of this type.`)) return;
    setError('');
    setNotice('');
    try {
      await api.deleteLeaveType(token, lt.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="page-loading">Loading...</p>;

  return (
    <div className="page">
      <h2>Leave types</h2>
      <p className="muted-small">
        Change the yearly days for each leave type, or mark it unlimited. Changing the number only affects people added later,
        unless you tick "Apply to everyone's {year} balance" before saving.
      </p>
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-success">{notice}</p>}
      <table className="request-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Days per year</th>
            <th>Unlimited</th>
            <th>Existing balances</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leaveTypes.map((lt) => (
            <LeaveTypeRow
              key={`${lt.id}-${lt.name}-${lt.default_days_per_year}-${lt.is_unlimited}`}
              lt={lt}
              year={year}
              onSave={handleSave}
              onPin={handlePin}
              onDelete={handleDelete}
            />
          ))}
        </tbody>
      </table>

      <form className="request-form" onSubmit={handleCreate}>
        <h3>Add leave type</h3>
        <div className="form-row">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Days per year
            <input
              type="number"
              min="0"
              max="366"
              step="0.5"
              value={newUnlimited ? '' : defaultDays}
              placeholder={newUnlimited ? 'Unlimited' : ''}
              disabled={newUnlimited}
              onChange={(e) => setDefaultDays(e.target.value)}
              required={!newUnlimited}
            />
          </label>
          <label className="inline-check">
            <input type="checkbox" checked={newUnlimited} onChange={(e) => setNewUnlimited(e.target.checked)} /> Unlimited
          </label>
        </div>
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
