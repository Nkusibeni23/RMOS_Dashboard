'use client';

import { useState } from 'react';
import type { Device } from '@/lib/types';

/**
 * Hardware + enrollment facts for the device. These come back on every device fetch but had nowhere
 * to live, so the Overview tab is where you look them up (IMEI for a carrier blacklist request,
 * serials for an RMA, build for a support ticket). Mono values are one click to copy.
 */
export function DeviceInfoCard({ device }: { device: Device }) {
  const rows: { label: string; value: string | null; mono?: boolean }[] = [
    { label: 'Model', value: device.model },
    { label: 'IMEI', value: device.imei, mono: true },
    { label: 'Serial', value: device.serialNumber, mono: true },
    { label: 'Hardware serial', value: device.hardwareSerial, mono: true },
    { label: 'Android', value: device.androidVersion },
    { label: 'RM OS build', value: device.romBuild, mono: true },
    {
      label: 'Enrolled',
      value: device.enrolledAt
        ? new Date(device.enrolledAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : null,
    },
    { label: 'Managed by', value: device.owner?.email ?? null },
  ].filter((r) => r.value);

  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-rm-line bg-rm-panel p-5 shadow-card">
      <h3 className="font-semibold text-rm-fog mb-4">Device details</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-3 border-b border-rm-line/60 pb-2 last:border-b-0"
          >
            <dt className="text-xs text-rm-slate shrink-0">{r.label}</dt>
            <dd
              className={`min-w-0 text-sm text-rm-ink text-right ${
                r.mono ? 'font-mono' : ''
              }`}
            >
              {r.mono ? (
                <CopyValue value={r.value!} label={r.label} />
              ) : (
                <span className="truncate">{r.value}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — the value is still selectable by hand */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
      className="group inline-flex items-center gap-1.5 max-w-full rounded px-1 -mx-1 hover:bg-rm-canvas transition"
    >
      <span className="truncate">{value}</span>
      <span
        className={`shrink-0 transition ${
          copied
            ? 'text-rm-green-deep'
            : 'text-rm-slate opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
        }`}
      >
        {copied ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
          </svg>
        )}
      </span>
    </button>
  );
}
