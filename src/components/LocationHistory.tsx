'use client';

import type { LocationPing } from '@/lib/types';
import { timeAgo } from '@/lib/labels';

/**
 * Ping timeline that sits under the map. Clicking a row centres the map on that fix, so the map and
 * the list are two views of the same selection. Renders nothing until the phone has reported once.
 */
export function LocationHistory({
  locations,
  selectedId,
  onSelect,
}: {
  locations: LocationPing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (locations.length === 0) return null;

  const activeId = selectedId ?? locations[0].id;

  return (
    <section className="rounded-2xl border border-rm-line bg-rm-panel shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="font-semibold text-rm-fog">Location history</h3>
        <span className="text-xs text-rm-slate">
          {locations.length} fix{locations.length === 1 ? '' : 'es'}
        </span>
      </div>

      <ul className="max-h-[290px] overflow-y-auto border-t border-rm-line">
        {locations.map((p, i) => {
          const active = p.id === activeId;
          return (
            <li
              key={p.id}
              className={`group flex items-stretch border-b border-rm-line last:border-b-0 transition-colors ${
                active ? 'bg-rm-green-soft' : 'hover:bg-rm-canvas'
              }`}
            >
              <span
                aria-hidden
                className={`w-[3px] shrink-0 ${active ? 'bg-rm-green' : 'bg-transparent'}`}
              />
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                aria-current={active}
                className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className={`shrink-0 w-2 h-2 rounded-full ${
                    i === 0 ? 'bg-rm-green' : 'bg-rm-slate/40'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium truncate ${
                        active ? 'text-rm-green-deep' : 'text-rm-ink'
                      }`}
                    >
                      {timeAgo(p.reportedAt)}
                    </span>
                    {i === 0 && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-rm-green/15 text-rm-green-deep">
                        Latest
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-rm-slate mt-0.5 truncate">
                    {new Date(p.reportedAt).toLocaleString()}
                  </span>
                </span>
                <span className="hidden sm:flex shrink-0 items-center gap-1.5">
                  {p.accuracyM != null && (
                    <Chip label={`±${Math.round(p.accuracyM)} m`} />
                  )}
                  {p.source && <Chip label={p.source} />}
                  {p.speedMps != null && p.speedMps > 0.5 && (
                    <Chip label={`${Math.round(p.speedMps * 3.6)} km/h`} />
                  )}
                </span>
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
                target="_blank"
                rel="noreferrer"
                title="Open in Google Maps"
                aria-label={`Open the ${new Date(p.reportedAt).toLocaleString()} fix in Google Maps`}
                className="shrink-0 grid place-items-center px-4 text-rm-slate opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-rm-green-deep transition"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full border border-rm-line bg-rm-canvas text-[11px] font-medium text-rm-slate tabular-nums">
      {label}
    </span>
  );
}
