'use client';

import { useEffect, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string; icon?: React.ReactNode };

/**
 * Fully custom dropdown (not a native <select>) so the OPEN menu is styled consistently across
 * every OS/browser — hover states, a check on the selected row, click-outside + Escape to close.
 * Same API as a plain select so it drops in anywhere.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder ?? 'Select…';

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-rm-line bg-rm-panel pl-3 pr-2.5 py-2 text-sm transition cursor-pointer hover:border-rm-green/40 focus:border-rm-green focus:outline-none focus:ring-2 focus:ring-rm-green/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={`flex items-center gap-2 truncate ${selected ? 'text-rm-ink' : 'text-rm-slate'}`}>
          {selected?.icon && <span className="shrink-0 text-rm-slate">{selected.icon}</span>}
          <span className="truncate">{display}</span>
        </span>
        <svg
          className={`shrink-0 text-rm-slate transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-1 w-full min-w-max max-h-64 overflow-auto rounded-lg border border-rm-line bg-rm-panel py-1 shadow-lg animate-fade-up"
        >
          {placeholder !== undefined && (
            <Row label={placeholder} muted selected={!value} onClick={() => pick('')} />
          )}
          {options.map((o) => (
            <Row
              key={o.value}
              label={o.label}
              icon={o.icon}
              selected={o.value === value}
              onClick={() => pick(o.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  icon,
  selected,
  muted = false,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  selected: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-rm-green-soft ${
        selected
          ? 'text-rm-green-deep font-medium bg-rm-green-soft/60'
          : muted
            ? 'text-rm-slate'
            : 'text-rm-ink'
      }`}
    >
      <span className="flex items-center gap-2 truncate">
        {icon && <span className="shrink-0 text-rm-slate">{icon}</span>}
        <span className="truncate">{label}</span>
      </span>
      {selected && (
        <svg
          className="shrink-0 text-rm-green"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}
