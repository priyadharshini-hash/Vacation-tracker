import { useEffect, useRef, useState } from 'react';

export function PinIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12.6 2.2a1 1 0 0 1 1.4 0l3.8 3.8a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.2.2l-1.3-.6-2.7 2.7.5 3.1a1 1 0 0 1-.3.9l-.7.7a1 1 0 0 1-1.4 0l-2.6-2.6-4.2 4.2a.8.8 0 1 1-1.1-1.1l4.2-4.2-2.6-2.6a1 1 0 0 1 0-1.4l.7-.7a1 1 0 0 1 .9-.3l3.1.5 2.7-2.7-.6-1.3a1 1 0 0 1 .2-1.2l1.2-1Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Rounded dropdown for choosing a leave type. The default (pinned) type shows a pin icon.
 * options: [{ id, name, is_default }]
 */
export function LeaveTypeSelect({ options, value, onChange, ariaLabel = 'Leave type' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => String(o.id) === String(value));

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="pill-select" ref={ref}>
      <button
        type="button"
        className={`pill-select-trigger${open ? ' open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{selected?.name || 'Select'}</span>
        {selected?.is_default && <PinIcon />}
        <ChevronIcon />
      </button>
      {open && (
        <ul className="pill-select-menu" role="listbox">
          {options.map((o) => (
            <li
              key={o.id}
              role="option"
              aria-selected={String(o.id) === String(value)}
              className={String(o.id) === String(value) ? 'selected' : ''}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
            >
              <span>{o.name}</span>
              {o.is_default && <PinIcon />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
