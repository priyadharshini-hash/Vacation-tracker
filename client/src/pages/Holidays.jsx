import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function Holidays() {
  const { token, user } = useAuth();
  const thisYear = new Date().getFullYear();
  const [tab, setTab] = useState(thisYear);
  const [holidays, setHolidays] = useState([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setHolidays(await api.getHolidays(token, tab));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createHoliday(token, { name, date });
      setName('');
      setDate('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api.deleteHoliday(token, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="panel">
        <div className="tab-row">
          <button className={tab === thisYear ? 'tab active' : 'tab'} onClick={() => setTab(thisYear)}>
            Holidays for {thisYear}
          </button>
          <button className={tab === thisYear + 1 ? 'tab active' : 'tab'} onClick={() => setTab(thisYear + 1)}>
            Holidays for {thisYear + 1}
          </button>
          <button className={tab === thisYear - 1 ? 'tab active' : 'tab'} onClick={() => setTab(thisYear - 1)}>
            Past holidays
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="page-loading">Loading...</p>
        ) : holidays.length === 0 ? (
          <p className="empty-state">No data</p>
        ) : (
          <table className="request-table">
            <thead>
              <tr>
                <th>Holiday name</th>
                <th>Date</th>
                {user.role === 'admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{formatDate(h.date)}</td>
                  {user.role === 'admin' && (
                    <td>
                      <button className="secondary" onClick={() => handleDelete(h.id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {user.role === 'admin' && (
        <form className="panel request-leave-form" onSubmit={handleAdd}>
          <h3>Add holiday</h3>
          <div className="form-row">
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
          </div>
          <button type="submit">Add</button>
        </form>
      )}
    </div>
  );
}
