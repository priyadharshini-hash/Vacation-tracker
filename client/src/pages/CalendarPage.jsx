import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { FilterDropdown } from '../components/calendar/FilterDropdown.jsx';
import { MonthView } from '../components/calendar/MonthView.jsx';
import { ListView } from '../components/calendar/ListView.jsx';
import { SyncModal } from '../components/calendar/SyncModal.jsx';
import { WORK_WEEKS, buildMonthWeeks, toIso } from '../components/calendar/dates.js';
import '../components/calendar/calendar.css';

const TYPE_COLORS = ['type-color-1', 'type-color-2', 'type-color-3', 'type-color-4', 'type-color-5'];
const PREFS_KEY = 'calendar-prefs';

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch {
    return {};
  }
}

function savePrefs(patch) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...patch }));
  } catch {
    // storage unavailable: preferences just won't persist
  }
}

export function CalendarPage() {
  const { token } = useAuth();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [view, setView] = useState(() => (readPrefs().view === 'list' ? 'list' : 'month'));
  const [workWeek, setWorkWeek] = useState(() => (WORK_WEEKS[readPrefs().workWeek] ? readPrefs().workWeek : 'mon-fri'));
  const [entries, setEntries] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncOpen, setSyncOpen] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = useMemo(() => buildMonthWeeks(year, month), [year, month]);
  const rangeStart = toIso(weeks[0][0]);
  const rangeEnd = toIso(weeks[weeks.length - 1][6]);
  const todayIso = toIso(new Date());

  useEffect(() => {
    Promise.all([api.getLeaveTypes(token), api.getDepartments(token), api.getLocations(token)])
      .then(([types, depts, locs]) => {
        setLeaveTypes(types);
        setDepartmentOptions(depts);
        setLocationOptions(locs);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const years = [...new Set([Number(rangeStart.slice(0, 4)), Number(rangeEnd.slice(0, 4))])];
    Promise.all([
      api.getCalendar(token, rangeStart, rangeEnd, selectedDepartments, selectedLocations),
      ...years.map((y) => api.getHolidays(token, y)),
    ])
      .then(([cal, ...holidayLists]) => {
        if (cancelled) return;
        setEntries(cal);
        setHolidays(holidayLists.flat().filter((h) => h.date >= rangeStart && h.date <= rangeEnd));
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, rangeStart, rangeEnd, selectedDepartments, selectedLocations]);

  const colorFor = useMemo(() => {
    const map = {};
    leaveTypes.forEach((lt, i) => {
      map[lt.id] = TYPE_COLORS[i % TYPE_COLORS.length];
    });
    return (typeId) => map[typeId] || TYPE_COLORS[0];
  }, [leaveTypes]);

  // Legend lists the leave types that appear this month (all of them when the month is empty).
  const legendTypes = useMemo(() => {
    const present = new Set(entries.map((e) => e.leaveTypeId));
    const used = leaveTypes.filter((lt) => present.has(lt.id));
    return used.length > 0 ? used : leaveTypes;
  }, [entries, leaveTypes]);

  function changeView(next) {
    setView(next);
    savePrefs({ view: next });
  }

  function changeWorkWeek(next) {
    setWorkWeek(next);
    savePrefs({ workWeek: next });
  }

  return (
    <div className="page cal-page">
      <div className="cal-title-row">
        <h2 className="panel-title">Calendar</h2>
        <button className="sync-btn" onClick={() => setSyncOpen(true)}>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M5.5 1.8a.8.8 0 0 1 .8.8v1h7.4v-1a.8.8 0 0 1 1.6 0v1h.5A2.2 2.2 0 0 1 18 5.8v10A2.2 2.2 0 0 1 15.8 18H4.2A2.2 2.2 0 0 1 2 15.8v-10a2.2 2.2 0 0 1 2.2-2.2h.5v-1a.8.8 0 0 1 .8-.8zM3.6 8v7.8c0 .3.3.6.6.6h11.6c.3 0 .6-.3.6-.6V8H3.6z" />
          </svg>
          Sync with your calendar (Google, Outlook, etc.)
        </button>
      </div>

      <div className="cal-controls">
        <div className="calendar-legend">
          {legendTypes.map((lt) => (
            <span key={lt.id} className={`legend-chip ${colorFor(lt.id)}`}>
              {lt.name}
            </span>
          ))}
          <span className="legend-chip holiday-bar">Holidays</span>
        </div>
        <div className="cal-filters">
          <FilterDropdown label="Locations" options={locationOptions} selected={selectedLocations} onChange={setSelectedLocations} />
          <FilterDropdown
            label="Departments"
            options={departmentOptions}
            selected={selectedDepartments}
            onChange={setSelectedDepartments}
            searchable
          />
          <FilterDropdown label="Labels" options={[]} selected={[]} onChange={() => {}} locked lockedHint="Labels are coming soon" />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="cal-toolbar">
        <div className="cal-nav">
          <div className="seg">
            <button aria-label="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))}>
              &#8249;
            </button>
            <button aria-label="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))}>
              &#8250;
            </button>
          </div>
          <button
            className="today-btn"
            onClick={() => {
              const now = new Date();
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            today
          </button>
        </div>
        <strong className="cal-month-title">{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
        <div className="cal-toggles">
          <div className="seg seg-text" role="group" aria-label="Work week">
            {Object.entries(WORK_WEEKS).map(([key, w]) => (
              <button key={key} className={workWeek === key ? 'on' : ''} onClick={() => changeWorkWeek(key)}>
                {w.label}
              </button>
            ))}
          </div>
          <div className="seg seg-text" role="group" aria-label="View">
            <button className={view === 'month' ? 'on' : ''} onClick={() => changeView('month')}>
              Month view
            </button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => changeView('list')}>
              List view
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="page-loading">Loading...</p>
      ) : view === 'month' ? (
        <MonthView
          weeks={weeks}
          month={month}
          entries={entries}
          holidays={holidays}
          colorFor={colorFor}
          nonWorking={WORK_WEEKS[workWeek].nonWorking}
          todayIso={todayIso}
        />
      ) : (
        <ListView year={year} month={month} entries={entries} holidays={holidays} colorFor={colorFor} todayIso={todayIso} />
      )}

      {syncOpen && <SyncModal token={token} onClose={() => setSyncOpen(false)} />}
    </div>
  );
}
