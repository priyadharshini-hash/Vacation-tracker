// Local-time date helpers shared by the calendar views (toISOString would shift days across timezones).

export function toIso(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function parseIso(iso) {
  return new Date(`${iso}T00:00:00`);
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Monday-first weeks covering the month, as arrays of 7 Date objects. */
export function buildMonthWeeks(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  const gridStart = new Date(year, month, 1 - offset);
  return Array.from({ length: rows }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)));
}

// Columns are Monday-first: 0=Mon ... 6=Sun
export const WORK_WEEKS = {
  'mon-fri': { label: 'Mon-Fri', nonWorking: [5, 6] },
  'sun-thu': { label: 'Sun-Thu', nonWorking: [4, 5] },
};
