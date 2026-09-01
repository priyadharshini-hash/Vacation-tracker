import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

export function AdminLeaveTypes() {
  const { token } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [name, setName] = useState('');
  const [defaultDays, setDefaultDays] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
    try {
      await api.createLeaveType(token, { name, defaultDaysPerYear: Number(defaultDays) });
      setName('');
      setDefaultDays('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api.deleteLeaveType(token, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="page-loading">Loading...</p>;

  return (
    <div className="page">
      <h2>Leave types</h2>
      {error && <p className="form-error">{error}</p>}
      <table className="request-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Default days/year</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leaveTypes.map((lt) => (
            <tr key={lt.id}>
              <td>{lt.name}</td>
              <td>{lt.default_days_per_year}</td>
              <td>
                <button className="secondary" onClick={() => handleDelete(lt.id)}>
                  Delete
                </button>
              </td>
            </tr>
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
            Default days/year
            <input
              type="number"
              min="0"
              value={defaultDays}
              onChange={(e) => setDefaultDays(e.target.value)}
              required
            />
          </label>
        </div>
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
