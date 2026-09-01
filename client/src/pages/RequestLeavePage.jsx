import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

export function RequestLeavePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getLeaveTypes(token).then((types) => {
      setLeaveTypes(types);
      setLeaveTypeId(types[0]?.id ?? '');
    });
  }, [token]);

  function reset() {
    setStartDate('');
    setEndDate('');
    setReason('');
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!leaveTypeId || !startDate || !endDate) {
      setError('Leave type and both dates are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createRequest(token, { leaveTypeId: Number(leaveTypeId), startDate, endDate, reason });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="panel">
        <h2 className="panel-title">Request Leave</h2>
        {error && <p className="form-error">{error}</p>}
        <form className="request-leave-form" onSubmit={handleSubmit}>
          <label>
            <span className="required-label">Leave Type</span>
            <select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="required-label">Start and End Date</span>
            <span className="date-range-row">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <span className="date-range-arrow">&#8594;</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </span>
          </label>
          <label>
            Reason
            <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="row-actions">
            <button type="button" className="secondary-outline" onClick={() => navigate('/')}>
              Cancel
            </button>
            <button type="button" className="secondary" onClick={reset}>
              Reset
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Requesting...' : 'Request Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
