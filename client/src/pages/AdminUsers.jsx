import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

function NewUserForm({ users, onCreated }) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [managerId, setManagerId] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const managers = users.filter((u) => u.role === 'manager' || u.role === 'admin');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createUser(token, {
        name,
        email,
        password,
        role,
        managerId: managerId ? Number(managerId) : null,
        department: department || null,
        location: location || null,
      });
      setName('');
      setEmail('');
      setPassword('');
      setRole('employee');
      setManagerId('');
      setDepartment('');
      setLocation('');
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <h3>Add user</h3>
      {error && <p className="form-error">{error}</p>}
      <div className="form-row">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
      </div>
      <div className="form-row">
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label>
          Manager
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">None</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Department
          <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Shared Services" />
        </label>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. India" />
        </label>
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create user'}
      </button>
    </form>
  );
}

function ProfileEditor({ user, onSaved }) {
  const { token } = useAuth();
  const [department, setDepartment] = useState(user.department || '');
  const [location, setLocation] = useState(user.location || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDepartment(user.department || '');
    setLocation(user.location || '');
  }, [user]);

  async function save() {
    setError('');
    setSaving(true);
    try {
      await api.updateUser(token, user.id, { department: department || null, location: location || null });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="balances-editor">
      <h4>Profile for {user.name}</h4>
      {error && <p className="form-error">{error}</p>}
      <div className="form-row">
        <label>
          Department
          <input value={department} onChange={(e) => setDepartment(e.target.value)} onBlur={save} />
        </label>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} onBlur={save} />
        </label>
        {saving && <span>Saving...</span>}
      </div>
    </div>
  );
}

function BalancesEditor({ user }) {
  const { token } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  async function load() {
    const [lt, bal] = await Promise.all([api.getLeaveTypes(token), api.getBalances(token, user.id)]);
    setLeaveTypes(lt);
    setBalances(bal);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function save(leaveTypeId, allottedDays) {
    setError('');
    setSavingId(leaveTypeId);
    try {
      await api.setBalance(token, user.id, {
        leaveTypeId,
        year: new Date().getFullYear(),
        allottedDays: Number(allottedDays),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="balances-editor">
      <h4>Allowances for {user.name}</h4>
      {error && <p className="form-error">{error}</p>}
      {leaveTypes.map((lt) => {
        const balance = balances.find((b) => b.leaveTypeId === lt.id) || { allottedDays: 0, usedDays: 0 };
        return (
          <div key={lt.id} className="balance-row">
            <span>{lt.name}</span>
            <input
              type="number"
              min="0"
              defaultValue={balance.allottedDays}
              key={`${lt.id}-${balance.allottedDays}`}
              onBlur={(e) => save(lt.id, e.target.value)}
            />
            <span className="balance-detail">({balance.usedDays} used)</span>
            {savingId === lt.id && <span>Saving...</span>}
          </div>
        );
      })}
    </div>
  );
}

export function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await api.getUsers(token);
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="page-loading">Loading...</p>;

  return (
    <div className="page">
      <h2>Users</h2>
      <table className="request-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Manager</th>
            <th>Allowances</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.department || '-'}</td>
              <td>{u.managerName || '-'}</td>
              <td>
                <button onClick={() => setSelectedUser(u)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedUser && (
        <>
          <ProfileEditor user={selectedUser} onSaved={load} />
          <BalancesEditor user={selectedUser} />
        </>
      )}

      <NewUserForm users={users} onCreated={load} />
    </div>
  );
}
