import { useMemo } from 'react';
import { toIso } from './dates.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEADER_PX = 30;
const LANE_PX = 26;

/**
 * Lay out items (leaves + holidays) for one week as continuous bars.
 * Returns { bars: [{ item, startCol, endCol, lane, continuesBefore, continuesAfter }], lanes }.
 */
function layoutWeek(weekIso, items) {
  const first = weekIso[0];
  const last = weekIso[6];
  const segments = items
    .filter((it) => it.startDate <= last && it.endDate >= first)
    .map((it) => {
      const startCol = Math.max(
        weekIso.findIndex((d) => d >= it.startDate),
        0
      );
      let endCol = 6;
      for (let i = 6; i >= 0; i--) {
        if (weekIso[i] <= it.endDate) {
          endCol = i;
          break;
        }
      }
      return { item: it, startCol, endCol, continuesBefore: it.startDate < first, continuesAfter: it.endDate > last };
    })
    .sort(
      (a, b) =>
        a.startCol - b.startCol ||
        b.endCol - b.startCol - (a.endCol - a.startCol) ||
        a.item.sortKey.localeCompare(b.item.sortKey)
    );

  const laneEnds = []; // last occupied column per lane
  segments.forEach((seg) => {
    let lane = laneEnds.findIndex((end) => end < seg.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(seg.endCol);
    } else {
      laneEnds[lane] = seg.endCol;
    }
    seg.lane = lane;
  });
  return { bars: segments, lanes: laneEnds.length };
}

export function MonthView({ weeks, month, entries, holidays, colorFor, nonWorking, todayIso }) {
  const items = useMemo(
    () => [
      ...holidays.map((h) => ({
        key: `h${h.id}`,
        kind: 'holiday',
        label: h.name,
        title: `${h.name} (holiday)`,
        startDate: h.date,
        endDate: h.date,
        sortKey: `0${h.name}`, // holidays sort first
      })),
      ...entries.map((e) => ({
        key: `l${e.id}`,
        kind: 'leave',
        label: e.userName,
        title: `${e.userName} - ${e.leaveTypeName} (${e.startDate}${e.endDate !== e.startDate ? ` to ${e.endDate}` : ''})`,
        typeId: e.leaveTypeId,
        startDate: e.startDate,
        endDate: e.endDate,
        sortKey: `1${e.userName}`,
      })),
    ],
    [entries, holidays]
  );

  return (
    <div className="cal">
      <div className="cal-head">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      {weeks.map((week) => {
        const weekIso = week.map(toIso);
        const { bars, lanes } = layoutWeek(weekIso, items);
        const minHeight = HEADER_PX + Math.max(lanes, 1) * LANE_PX + 12;
        return (
          <div className="cal-week" key={weekIso[0]} style={{ minHeight }}>
            <div className="cal-days">
              {week.map((day, col) => {
                const iso = weekIso[col];
                const classes = ['cal-day'];
                if (day.getMonth() !== month) classes.push('outside');
                if (nonWorking.includes(col)) classes.push('nonworking');
                if (iso === todayIso) classes.push('today');
                return (
                  <div key={iso} className={classes.join(' ')}>
                    <span className="cal-daynum">{day.getDate()}</span>
                  </div>
                );
              })}
            </div>
            <div className="cal-bars" style={{ gridAutoRows: LANE_PX, paddingTop: HEADER_PX }}>
              {bars.map((b) => (
                <div
                  key={`${b.item.key}-${weekIso[0]}`}
                  className={`cal-bar ${b.item.kind === 'holiday' ? 'holiday-bar' : colorFor(b.item.typeId)}${
                    b.continuesBefore ? ' cont-before' : ''
                  }${b.continuesAfter ? ' cont-after' : ''}`}
                  style={{ gridColumn: `${b.startCol + 1} / ${b.endCol + 2}`, gridRow: b.lane + 1 }}
                  title={b.item.title}
                >
                  {b.item.label}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
