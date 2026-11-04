import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { LeaveTypeSelect } from '../components/LeaveTypeSelect.jsx';

// Local-time YYYY-MM-DD (toISOString would shift the day for users ahead of/behind UTC).
function isoDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function parseIso(iso) {
  return new Date(iso + 'T00:00:00');
}

const shortDay = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const longDay = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const rangeDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

// Monday-start week containing `date`, shifted by `offsetWeeks`.
function weekStart(date, offsetWeeks = 0) {
  const dow = (date.getDay() + 6) % 7; // Mon=0
  return addDays(date, -dow + offsetWeeks * 7);
}

const GOOD_COVERAGE = 0.8;

function Coverage({ available, total }) {
  const good = total === 0 || available / total >= GOOD_COVERAGE;
  return (
    <span className={`coverage ${good ? 'good' : 'low'}`}>
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M6.8 10.2l2.2 2.2 4.2-4.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {good ? 'Good coverage' : 'Low coverage'}
    </span>
  );
}

function MiniAvatar({ name }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return <span className="mini-avatar">{initials}</span>;
}

function DayCard({ title, date, people, total }) {
  const iso = isoDate(date);
  return (
    <div className="panel panel-flush avail-card">
      <div className="avail-head">
        <strong>
          {title} &bull; {shortDay(date)}
        </strong>
        <Coverage available={total - people.length} total={total} />
      </div>
      <ul className="avail-people">
        {people.map((p) => (
          <li key={p.id}>
            <MiniAvatar name={p.userName} />
            <span className="avail-name">{p.userName}</span>
            {p.endDate !== p.startDate && p.endDate >= iso && (
              <span className="avail-until">(until {longDay(parseIso(p.endDate))})</span>
            )}
          </li>
        ))}
      </ul>
      <div className="avail-foot">
        {Math.max(total - people.length, 0)} of {total} available
      </div>
    </div>
  );
}

function WeekCard({ monday, leaves, total }) {
  const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
  const outPerDay = days.map((d) => {
    const iso = isoDate(d);
    return leaves.filter((l) => l.startDate <= iso && l.endDate >= iso);
  });
  const avgOut = outPerDay.reduce((s, list) => s + list.length, 0) / days.length;
  const avgAvailable = Math.max(Math.round(total - avgOut), 0);
  return (
    <div className="panel panel-flush avail-card">
      <div className="avail-head">
        <strong>
          Next Week ({rangeDay(monday)} - {rangeDay(addDays(monday, 6))})
        </strong>
        <Coverage available={avgAvailable} total={total} />
      </div>
      <ul className="avail-week">
        {days.map((d, i) => (
          <li key={isoDate(d)}>
            <strong>{d.toLocaleDateString('en-US', { weekday: 'long' })}:</strong>
            <span className={outPerDay[i].length ? 'out-count has' : 'out-count'} title={outPerDay[i].map((p) => p.userName).join(', ')}>
              {outPerDay[i].length === 1 ? '1 person out' : `${outPerDay[i].length} people out`}
            </span>
          </li>
        ))}
      </ul>
      <div className="avail-foot">
        {avgAvailable} of {total} available on average
      </div>
    </div>
  );
}

function todayIso() {
  return isoDate(new Date());
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

function formatLongDate(date) {
  // e.g. "Wednesday, November 04, 2026" (two-digit day, like the official app)
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' });
}

function Icon({ children }) {
  return (
    <svg className="widget-icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {children}
    </svg>
  );
}

const CalendarIcon = () => (
  <Icon>
    <rect x="2.5" y="4" width="15" height="13.5" rx="1.5" />
    <path d="M2.5 8h15M6 2.5v3M14 2.5v3" strokeLinecap="round" />
  </Icon>
);
const PeopleIcon = () => (
  <Icon>
    <circle cx="7" cy="6.5" r="2.6" />
    <circle cx="14" cy="7.5" r="2.1" />
    <path d="M2.3 17c.8-3 3-4.5 4.7-4.5s3.9 1.5 4.7 4.5M12.5 17c.6-2.3 2-3.6 3.4-3.9" strokeLinecap="round" />
  </Icon>
);
const BarsIcon = () => (
  <Icon>
    <path d="M3 17h14M5.5 17V10M10 17V4M14.5 17v-5" strokeLinecap="round" />
  </Icon>
);
const GiftIcon = () => (
  <Icon>
    <rect x="3" y="8" width="14" height="9" rx="1.2" />
    <path d="M2.5 8h15v-2h-15zM10 6v11" strokeLinejoin="round" />
    <path d="M10 6C8 6 6.5 5 6.5 3.9S8.2 2.5 10 6c1.8-3.5 3.5-2.1 3.5-.1S12 6 10 6z" />
  </Icon>
);
const ArrowRight = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function SeeAll({ to, children = 'See all' }) {
  return (
    <Link to={to} className="see-all">
      {children} <ArrowRight />
    </Link>
  );
}

export function Dashboard() {
  const { token, user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [teamLeave, setTeamLeave] = useState([]);
  const [teamSize, setTeamSize] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getLeaveTypes(token),
      api.getBalances(token, user.id),
      api.getMyRequests(token),
      api.getHolidays(token, new Date().getFullYear()),
      api.me(token),
      api.getDepartments(token),
    ])
      .then(([lt, bal, reqs, hols, me, depts]) => {
        setLeaveTypes(lt);
        setBalances(bal);
        setRequests(reqs);
        setHolidays(hols);
        setProfile(me.user);
        setDepartments(depts);
        setDepartment(me.user.department && depts.includes(me.user.department) ? me.user.department : depts[0] || 'all');
        const pinned = lt.find((t) => t.is_default) || lt[0];
        setSelectedTypeId((prev) => prev || pinned?.id || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Team availability reloads whenever the department changes.
  useEffect(() => {
    if (!department) return;
    const end = addDays(weekStart(new Date(), 1), 6); // end of next week (Sunday)
    Promise.all([api.getCalendar(token, todayIso(), isoDate(end), department), api.getHeadcount(token, department)])
      .then(([team, headcount]) => {
        setTeamLeave(team);
        setTeamSize(headcount.count);
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department]);

  const selectedType = leaveTypes.find((lt) => lt.id === Number(selectedTypeId));
  const selectedBalance = balances.find((b) => b.leaveTypeId === Number(selectedTypeId));

  const stats = useMemo(() => {
    const today = todayIso();
    const forType = requests.filter((r) => r.leaveTypeId === Number(selectedTypeId));
    const sum = (list) => list.reduce((total, r) => total + Number(r.daysRequested), 0);
    return {
      taken: sum(forType.filter((r) => r.status === 'approved' && r.endDate < today)),
      scheduled: sum(forType.filter((r) => r.status === 'approved' && r.startDate >= today)),
      requested: sum(forType.filter((r) => r.status === 'pending')),
    };
  }, [requests, selectedTypeId]);

  // Approved future leaves plus any pending requests that haven't ended yet.
  const upcomingLeaves = useMemo(() => {
    const today = todayIso();
    return requests
      .filter((r) => (r.status === 'approved' && r.startDate >= today) || (r.status === 'pending' && r.endDate >= today))
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

  const year = new Date().getFullYear();
  const remaining = selectedBalance ? Number(selectedBalance.allottedDays) - Number(selectedBalance.usedDays) : 0;

  return (
    <div className="page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">
            {greeting()}, {user.name.split(' ')[0]}
          </h1>
          <p className="dashboard-date">{formatLongDate(new Date())}</p>
        </div>
        <Link to="/request" className="btn-link btn-with-icon">
          <span aria-hidden="true">+</span> Request Leave
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="dashboard-grid-balance">
        <div className="panel balance-panel">
          <div className="balance-top">
            <div>
              <div className="balance-days">{remaining}d</div>
              <p className="balance-caption">{selectedType?.name} balance</p>
            </div>
            <LeaveTypeSelect options={leaveTypes} value={selectedTypeId} onChange={setSelectedTypeId} />
          </div>
          <div className="balance-bottom">
            <p className="balance-period">
              January 1, {year} - December 31, {year}
            </p>
            <div className="balance-stats-row">
              <div>
                <div className="balance-stat-value">{stats.taken}d</div>
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
        </div>

        <div className="panel panel-flush">
          <div className="panel-header panel-header-ruled">
            <h3 className="panel-title-icon">
              <CalendarIcon /> Upcoming Leaves
            </h3>
            <SeeAll to="/calendar" />
          </div>
          {upcomingLeaves.length === 0 ? (
            <div className="empty-widget empty-with-icon">
              <svg viewBox="0 0 64 48" width="64" height="48" fill="none" aria-hidden="true">
                <path d="M6 28l8-18h36l8 18v14a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V28z" fill="#f1eefb" stroke="#d9d3ee" strokeWidth="2" strokeLinejoin="round" />
                <path d="M6 28h16a3 3 0 0 1 3 3 7 7 0 0 0 14 0 3 3 0 0 1 3-3h16" stroke="#d9d3ee" strokeWidth="2" />
              </svg>
              <p>You have no upcoming leaves or pending requests. Time to schedule a leave?</p>
              <Link to="/request" className="btn-link">
                Request Leave
              </Link>
            </div>
          ) : (
            <ul className="simple-list list-padded">
              {upcomingLeaves.map((r) => (
                <li key={r.id} className="upcoming-item">
                  <div>
                    <strong>{r.leaveTypeName}</strong>
                    <div className="muted-small">
                      {formatDate(r.startDate)}
                      {r.endDate !== r.startDate && ` - ${formatDate(r.endDate)}`} &middot; {Number(r.daysRequested)}d
                    </div>
                  </div>
                  {r.status === 'pending' && <span className="status-badge status-pending">pending</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="section-header">
        <h3 className="panel-title-icon">
          <PeopleIcon /> Team Availability
        </h3>
        <select className="plain-select" value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department">
          {(user.role === 'admin' || departments.length === 0) && <option value="all">Everyone</option>}
          {departments.map((d) => (
            <option key={d} value={d}>
              {d} department
            </option>
          ))}
        </select>
        <SeeAll to="/calendar">See full calendar</SeeAll>
      </div>
      {teamLeave.length === 0 ? (
        <div className="panel">
          <div className="empty-widget empty-sparkle">
            <div className="sparkle" aria-hidden="true">
              ✨
            </div>
            <p className="empty-title">No leaves in the next 2 weeks!</p>
            <p>Your team is fully available - great for planning ahead.</p>
          </div>
        </div>
      ) : (
        <div className="avail-grid">
          <DayCard title="Today" date={new Date()} people={teamLeave.filter((l) => l.startDate <= todayIso() && l.endDate >= todayIso())} total={teamSize} />
          <DayCard
            title="Tomorrow"
            date={addDays(new Date(), 1)}
            people={teamLeave.filter((l) => l.startDate <= isoDate(addDays(new Date(), 1)) && l.endDate >= isoDate(addDays(new Date(), 1)))}
            total={teamSize}
          />
          <WeekCard monday={weekStart(new Date(), 1)} leaves={teamLeave} total={teamSize} />
        </div>
      )}

      <div className="dashboard-grid-2">
        <div className="panel panel-flush">
          <div className="panel-header panel-header-ruled">
            <h3 className="panel-title-icon">
              <BarsIcon /> Quick Stats
            </h3>
          </div>
          <div className="panel-body">
            <div className="stat-row">
              <span>Requests this year</span>
              <strong>{requestsThisYear} requests</strong>
            </div>
            <div className="stat-row">
              <span>Your approver</span>
              <strong>{profile?.managerName || 'Not set'}</strong>
            </div>
          </div>
        </div>

        <div className="panel panel-flush">
          <div className="panel-header panel-header-ruled">
            <h3 className="panel-title-icon">
              <GiftIcon /> Upcoming holidays
            </h3>
            <SeeAll to="/holidays" />
          </div>
          <div className="panel-body">
            {upcomingHolidays.length === 0 ? (
              <p className="empty-state centered">No upcoming holidays</p>
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
    </div>
  );
}
