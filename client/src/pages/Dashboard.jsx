import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { token, user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [teamLeave, setTeamLeave] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const today = todayIso();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 6);

    setLoading(true);
    Promise.all([
      api.getLeaveTypes(token),
      api.getBalances(token, user.id),
      api.getMyRequests(token),
      api.getCalendar(token, today, weekEnd.toISOString().slice(0, 10)),
      api.getHolidays(token, new Date().getFullYear()),
      api.me(token),
    ])
      .then(([lt, bal, reqs, team, hols, me]) => {
        setLeaveTypes(lt);
        setBalances(bal);
        setRequests(reqs);
        setTeamLeave(team.filter((t) => t.userId !== user.id));
        setHolidays(hols);
        setProfile(me.user);
        setSelectedTypeId((prev) => prev || lt[0]?.id || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBalance = balances.find((b) => b.leaveTypeId === Number(selectedTypeId));

  const stats = useMemo(() => {
    const today = todayIso();
    const forType = requests.filter((r) => r.leaveTypeId === Number(selectedTypeId));
    const taken = forType
      .filter((r) => r.status === 'approved' && r.endDate < today)
      .reduce((sum, r) => sum + Number(r.daysRequested), 0);
    const scheduled = forType
      .filter((r) => r.status === 'approved' && r.startDate >= today)
      .reduce((sum, r) => sum + Number(r.daysRequested), 0);
    const requested = forType
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.daysRequested), 0);
    return { taken, scheduled, requested };
  }, [requests, selectedTypeId]);

  const upcomingLeaves = useMemo(() => {
    const today = todayIso();
    return requests
      .filter((r) => r.status === 'approved' && r.startDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 4);
  }, [requests]);

  const requestsThisYear = useMemo(
    () => requests.filter((r) => new Date(r.createdAt).getFullYear() === new Date().getFullYear()).length,
    [requests]
  );

  const upcomingHolidays = useMemo(() => {
    const today = todayIso();
    return holidays.filter((h) => h.date >= today).slice(0, 4);
  }, [holidays]);

  if (loading) return <p className="page-loading">Loading...</p>;

  return (
    <div className="page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">
            {greeting()}, {user.name.split(' ')[0]}
          </h1>
          <p className="dashboard-date">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Link to="/request" className="btn-link">
          + Request Leave
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="dashboard-grid-2">
        <div className="panel balance-panel">
          <div className="balance-panel-top">
            <div className="balance-days">{selectedBalance ? Number(selectedBalance.allottedDays) - Number(selectedBalance.usedDays) : 0}d</div>
            <select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)}>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>
          <p className="balance-caption">{leaveTypes.find((lt) => lt.id === Number(selectedTypeId))?.name} balance</p>
          <p className="balance-period">January 1, {new Date().getFullYear()} - December 31, {new Date().getFullYear()}</p>
          <div className="balance-stats-row">
            <div>
              <div className="balance-stat-value">{stats.taken}</div>
              <div className="balance-stat-label">TAKEN</div>
            </div>
            <div>
              <div className="balance-stat-value">{stats.scheduled}</div>
              <div className="balance-stat-label">SCHEDULED</div>
            </div>
            <div>
              <div className="balance-stat-value">{stats.requested}</div>
              <div className="balance-stat-label">REQUESTED</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Upcoming Leaves</h3>
            <Link to="/calendar">See all</Link>
          </div>
          {upcomingLeaves.length === 0 ? (
            <div className="empty-widget">
              <p>You have no upcoming leaves or pending requests. Time to schedule a leave?</p>
              <Link to="/request" className="btn-link">
                Request Leave
              </Link>
            </div>
          ) : (
            <ul className="simple-list">
              {upcomingLeaves.map((r) => (
                <li key={r.id}>
                  <strong>{r.leaveTypeName}</strong> &mdash; {formatDate(r.startDate)} to {formatDate(r.endDate)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Team Availability</h3>
          <Link to="/calendar">See full calendar</Link>
        </div>
        {teamLeave.length === 0 ? (
          <p className="empty-state">No leaves in the next 7 days. Your team is fully available.</p>
        ) : (
          <ul className="simple-list">
            {teamLeave.map((t) => (
              <li key={t.id}>
                <strong>{t.userName}</strong> &mdash; {t.leaveTypeName}, {formatDate(t.startDate)} to {formatDate(t.endDate)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dashboard-grid-2">
        <div className="panel">
          <h3>Quick Stats</h3>
          <div className="stat-row">
            <span>Requests this year</span>
            <strong>{requestsThisYear} requests</strong>
          </div>
          <div className="stat-row">
            <span>Your approver</span>
            <strong>{profile?.managerName || 'Not set'}</strong>
          </div>
        </div>

        <div className="panel">
          <h3>Upcoming holidays</h3>
          {upcomingHolidays.length === 0 ? (
            <p className="empty-state">No upcoming holidays</p>
          ) : (
            <ul className="simple-list">
              {upcomingHolidays.map((h) => (
                <li key={h.id}>
                  <strong>{h.name}</strong> &mdash; {formatDate(h.date)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
