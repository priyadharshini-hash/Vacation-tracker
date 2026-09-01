import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TYPE_COLORS = ['type-color-1', 'type-color-2', 'type-color-3', 'type-color-4', 'type-color-5'];

function toIso(date) {
  return date.toISOString().slice(0, 10);
}

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const gridStart = new Date(year, month, 1 - startOffset);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export function CalendarPage() {
  const { token, user } = useAuth();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [entries, setEntries] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);

  useEffect(() => {
    if (user.role === 'admin') {
      api.getUsers(token).then((users) => {
        const unique = [...new Set(users.map((u) => u.department).filter(Boolean))];
        setDepartments(unique);
      });
    }
  }, [token, user.role]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const start = toIso(days[0]);
    const end = toIso(days[days.length - 1]);
    Promise.all([
      api.getCalendar(token, start, end, user.role === 'admin' ? department : undefined),
      api.getHolidays(token, year),
      api.getLeaveTypes(token),
    ])
      .then(([cal, hols, types]) => {
        setEntries(cal);
        setHolidays(hols);
        setLeaveTypes(types);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, year, department]);

  const typeColorMap = useMemo(() => {
    const map = {};
    leaveTypes.forEach((lt, i) => {
      map[lt.id] = TYPE_COLORS[i % TYPE_COLORS.length];
    });
    return map;
  }, [leaveTypes]);

  function entriesForDay(day) {
    const iso = toIso(day);
    return entries.filter((e) => e.startDate <= iso && e.endDate >= iso);
  }

  function holidayForDay(day) {
    const iso = toIso(day);
    return holidays.find((h) => h.date === iso);
  }

  return (
    <div className="page">
      <div className="panel-header">
        <h2 className="panel-title">Calendar</h2>
        {user.role === 'admin' && (
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="calendar-legend">
        {leaveTypes.map((lt) => (
          <span key={lt.id} className={`legend-chip ${typeColorMap[lt.id]}`}>
            {lt.name}
          </span>
        ))}
        <span className="legend-chip holiday-color">Holidays</span>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="calendar-nav">
        <button className="secondary-outline" onClick={() => setCursor(new Date(year, month - 1, 1))}>
          &larr;
        </button>
        <button
          className="secondary-outline"
          onClick={() => {
            const now = new Date();
            setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
          }}
        >
          today
        </button>
        <strong>
          {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </strong>
        <button className="secondary-outline" onClick={() => setCursor(new Date(year, month + 1, 1))}>
          &rarr;
        </button>
      </div>

      {loading ? (
        <p className="page-loading">Loading...</p>
      ) : (
        <div className="calendar-grid">
          {WEEKDAYS.map((d) => (
            <div key={d} className="calendar-weekday">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const inMonth = day.getMonth() === month;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const holiday = holidayForDay(day);
            return (
              <div key={day.toISOString()} className={`calendar-cell${inMonth ? '' : ' outside-month'}${isWeekend ? ' weekend' : ''}`}>
                <div className="calendar-cell-date">{day.getDate()}</div>
                {holiday && <div className="calendar-entry holiday-color">{holiday.name}</div>}
                {entriesForDay(day).map((e) => (
                  <div key={e.id} className={`calendar-entry ${typeColorMap[e.leaveTypeId]}`}>
                    {e.userName}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
