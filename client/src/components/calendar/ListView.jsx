import { useMemo } from 'react';
import { parseIso, toIso } from './dates.js';

const dayHeading = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const shortDay = (iso) => parseIso(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Month as a day-by-day agenda: only days that have a leave or holiday are listed. */
export function ListView({ year, month, entries, holidays, colorFor, todayIso }) {
  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let i = 1; i <= count; i++) {
      const date = new Date(year, month, i);
      const iso = toIso(date);
      const dayHolidays = holidays.filter((h) => h.date === iso);
      const dayLeaves = entries.filter((e) => e.startDate <= iso && e.endDate >= iso);
      if (dayHolidays.length || dayLeaves.length) result.push({ date, iso, dayHolidays, dayLeaves });
    }
    return result;
  }, [year, month, entries, holidays]);

  if (days.length === 0) {
    return (
      <div className="panel cal-list-empty">
        <div aria-hidden="true">✨</div>
        <p>No leaves or holidays this month.</p>
      </div>
    );
  }

  return (
    <div className="cal-list">
      {days.map(({ date, iso, dayHolidays, dayLeaves }) => (
        <div key={iso} className={`cal-list-day${iso === todayIso ? ' today' : ''}`}>
          <div className="cal-list-date">{dayHeading(date)}</div>
          <ul>
            {dayHolidays.map((h) => (
              <li key={`h${h.id}`}>
                <span className="cal-chip holiday-bar">Holiday</span>
                <strong>{h.name}</strong>
              </li>
            ))}
            {dayLeaves.map((e) => (
              <li key={`l${e.id}-${iso}`}>
                <span className="mini-avatar">{initials(e.userName)}</span>
                <strong>{e.userName}</strong>
                <span className={`cal-chip ${colorFor(e.leaveTypeId)}`}>{e.leaveTypeName}</span>
                <span className="cal-list-range">
                  {e.startDate === e.endDate ? shortDay(e.startDate) : `${shortDay(e.startDate)} - ${shortDay(e.endDate)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
