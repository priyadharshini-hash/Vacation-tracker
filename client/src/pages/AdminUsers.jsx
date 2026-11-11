import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

const PenIcon = () => (
  <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" strokeLinejoin="round" />
    <path d="M12 5l3 3" />
  </svg>
);

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Add / edit window. `user` is null when adding a person.
 * Editing saves the profile and any changed yearly allowances together with one Save.
 */
function UserDialog({ user, users, leaveTypes, departments, locations, year, onClose, onDone }) {
  const { token, user: me } = useAuth();
  const isNew = !user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role ?? 'employee');
  const [managerId, setManagerId] = useState(user?.managerId ? String(user.managerId) : '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [allowances, setAllowances] = useState(null); // { [leaveTypeId]: { allotted: string, used: number, original: string } }
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const managers = users.filter((u) => (u.role === 'manager' || u.role === 'admin') && u.id !== user?.id);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (isNew) return;
    api
      .getBalances(token, user.id)
      .then((rows) => {
        const map = {};
        rows.forEach((b) => {
          const allotted = b.allottedDays == null ? '0' : String(Number(b.allottedDays));
          map[b.leaveTypeId] = { allotted, original: allotted, used: Number(b.usedDays || 0) };
        });
        setAllowances(map);
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter a name.');
    if (isNew && (!email.trim() || !password)) return setError('Email and password are required.');
    if (!isNew && allowances) {
      const bad = leaveTypes.find((lt) => !lt.is_unlimited && allowances[lt.id] && (allowances[lt.id].allotted === '' || Number(allowances[lt.id].allotted) < 0));
      if (bad) return setError(`Enter a valid number of days for ${bad.name}.`);
    }

    setSaving(true);
    try {
      const profile = {
        name: name.trim(),
        role,
        managerId: managerId ? Number(managerId) : null,
        department: department.trim() || null,
        location: location.trim() || null,
      };
      if (isNew) {
        await api.createUser(token, { ...profile, email: email.trim(), password });
      } else {
        await api.updateUser(token, user.id, profile);
        if (allowances) {
          for (const lt of leaveTypes) {
            const a = allowances[lt.id];
            if (lt.is_unlimited || !a || a.allotted === a.original) continue;
            await api.setBalance(token, user.id, { leaveTypeId: lt.id, year, allottedDays: Number(a.allotted) });
          }
        }
      }
      await onDone(isNew ? `${name.trim()} was added.` : `Saved changes for ${name.trim()}.`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const editingSelf = !isNew && user.id === me.id;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal modal-wide" role="dialog" aria-modal="true" aria-label={isNew ? 'Add user' : 'Edit user'} onSubmit={submit}>
        <div className="modal-head">
          <h3>{isNew ? 'Add user' : `Edit ${user.name}`}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="dialog-grid">
          <label className="field">
            Name
            <input id="user-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className="field">
            Email
            {isNew ? (
              <input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            ) : (
              <input id="user-email" value={email} readOnly disabled />
            )}
          </label>
          {isNew && (
            <label className="field">
              Password
              <input id="user-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </label>
          )}
          <label className="field">
            Role
            <select id="user-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value} disabled={editingSelf && r.value !== 'admin'}>
                  {r.label}
                </option>
              ))}
            </select>
            {editingSelf && <small className="field-hint">You can't remove your own admin role.</small>}
          </label>
          <label className="field">
            Manager (approves their leave)
            <select id="user-manager" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">No manager</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Department
            <input id="user-department" list="department-options" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Shared Services" />
          </label>
          <label className="field">
            Location
            <input id="user-location" list="location-options" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. India" />
          </label>
        </div>
        <datalist id="department-options">
          {departments.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <datalist id="location-options">
          {locations.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>

        {!isNew && (
          <div className="allowances">
            <h4>Leave allowances for {year}</h4>
            {!allowances && !error && <p className="muted-small">Loading...</p>}
            {allowances &&
              leaveTypes.map((lt) => {
                const a = allowances[lt.id] || { allotted: '0', original: '0', used: 0 };
                return (
                  <div className="allowance-row" key={lt.id}>
                    <span className="allowance-name">{lt.name}</span>
                    {lt.is_unlimited ? (
                      <span className="balance-unlimited">Unlimited</span>
                    ) : (
                      <span className="allowance-input">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          aria-label={`${lt.name} days`}
                          value={a.allotted}
                          onChange={(e) => setAllowances({ ...allowances, [lt.id]: { ...a, allotted: e.target.value } })}
                        />
                        days
                      </span>
                    )}
                    <span className="allowance-used">{a.used} used</span>
                  </div>
                );
              })}
          </div>
        )}

        <div className="modal-actions modal-actions-end">
          <button type="button" className="secondary-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Add user' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AdminUsers() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState(null); // null | { user: object | null }
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  async function load() {
    const [list, types] = await Promise.all([api.getUsers(token), api.getLeaveTypes(token)]);
    setUsers(list);
    setLeaveTypes(types);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err.message);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const departments = useMemo(() => [...new Set(users.map((u) => u.department).filter(Boolean))].sort(), [users]);
  const locations = useMemo(() => [...new Set(users.map((u) => u.location).filter(Boolean))].sort(), [users]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.name, u.email, u.department, u.location, u.role, u.managerName].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [users, query]);

  async function handleDone(message) {
    await load();
    setDialog(null);
    setNotice(message);
  }

  if (loading) return <p className="page-loading">Loading...</p>;

  return (
    <div className="page">
      <div className="panel-header">
        <h2 className="panel-title">Users</h2>
        <button
          onClick={() => {
            setNotice('');
            setDialog({ user: null });
          }}
        >
          + Add user
        </button>
      </div>
      <p className="muted-small">Use the pen to change a person's role, manager, department, location or yearly leave days.</p>

      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-success">{notice}</p>}

      <input
        className="user-search"
        type="search"
        placeholder="Search by name, email, department, location or role"
        aria-label="Search users"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="table-scroll">
        <table className="request-table users-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Department</th>
              <th>Location</th>
              <th>Manager</th>
              <th className="lt-actions-col">Edit</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="user-cell">
                    <span className="mini-avatar">{initials(u.name)}</span>
                    <div>
                      <div className="user-name">
                        {u.name}
                        {u.id === me.id && <span className="you-tag">You</span>}
                      </div>
                      <div className="user-email">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-pill role-${u.role}`}>{u.role}</span>
                </td>
                <td>{u.department || '-'}</td>
                <td>{u.location || '-'}</td>
                <td>{u.managerName || '-'}</td>
                <td className="lt-actions-col">
                  <button
                    className="icon-btn"
                    title="Edit"
                    aria-label={`Edit ${u.name}`}
                    onClick={() => {
                      setNotice('');
                      setDialog({ user: u });
                    }}
                  >
                    <PenIcon />
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  No users match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog && (
        <UserDialog
          key={dialog.user?.id ?? 'new'}
          user={dialog.user}
          users={users}
          leaveTypes={leaveTypes}
          departments={departments}
          locations={locations}
          year={year}
          onClose={() => setDialog(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
