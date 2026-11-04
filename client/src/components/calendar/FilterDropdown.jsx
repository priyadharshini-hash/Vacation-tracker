import { useEffect, useRef, useState } from 'react';

const Chevron = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Lock = () => (
  <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
  </svg>
);

const Search = () => (
  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <circle cx="9" cy="9" r="5.5" />
    <path d="M13.5 13.5L17 17" strokeLinecap="round" />
  </svg>
);

/**
 * Multi-select filter button with a dropdown list.
 * `locked` renders it disabled with a lock icon (feature not available yet).
 */
export function FilterDropdown({ label, options, selected, onChange, searchable = false, locked = false, lockedHint }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()));

  function toggle(option) {
    onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]);
  }

  return (
    <div className="filter-dd" ref={ref}>
      <button
        type="button"
        className={`filter-dd-trigger${selected.length ? ' active' : ''}`}
        disabled={locked}
        title={locked ? lockedHint : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        {selected.length > 0 && <span className="filter-count">{selected.length}</span>}
        {locked ? <Lock /> : null}
        <Chevron />
      </button>

      {open && !locked && (
        <div className="filter-dd-menu">
          {searchable && (
            <label className="filter-search">
              <Search />
              <input autoFocus placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          )}
          <ul role="listbox" aria-multiselectable="true">
            {visible.length === 0 && <li className="filter-empty">No matches</li>}
            {visible.map((o) => (
              <li key={o} role="option" aria-selected={selected.includes(o)} className={selected.includes(o) ? 'selected' : ''} onClick={() => toggle(o)}>
                <span>{o}</span>
                {selected.includes(o) && <span aria-hidden="true">✓</span>}
              </li>
            ))}
          </ul>
          {selected.length > 0 && (
            <button type="button" className="filter-clear" onClick={() => onChange([])}>
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
