import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { RequestTable } from '../components/RequestTable.jsx';

export function TeamRequests() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRequests(await api.getTeamRequests(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function decide(id, status) {
    setError('');
    try {
      await api.decideRequest(token, id, status);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="page-loading">Loading...</p>;

  return (
    <div className="page">
      <h2>Pending team requests</h2>
      {error && <p className="form-error">{error}</p>}
      <RequestTable
        requests={requests}
        showEmployee
        actions={(r) => (
          <div className="row-actions">
            <button onClick={() => decide(r.id, 'approved')}>Approve</button>
            <button className="secondary" onClick={() => decide(r.id, 'rejected')}>
              Reject
            </button>
          </div>
        )}
      />
    </div>
  );
}
