'use client';

import { useState } from 'react';
import { sendCommand } from '@/lib/api';
import type { CommandType } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { friendlyCommand } from '@/lib/labels';
import { RebootIcon, InstallIcon, RefreshIcon } from '@/components/icons';

/**
 * Remote device controls for the RMSoft OS background agent — the useful, non-kiosk actions:
 * reboot, disable/enable the camera (security), remotely install an app, and push an OTA update.
 * Each is fire-and-forget over MQTT; the command history below reflects the result.
 */
export function KioskPanel({
  deviceId,
  onError,
  onDone,
}: {
  deviceId: string;
  onError?: (msg: string) => void;
  onDone?: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [apkUrl, setApkUrl] = useState('');
  const [updateUrl, setUpdateUrl] = useState('');

  async function run(key: string, type: CommandType, payload?: Record<string, unknown>) {
    setBusy(key);
    try {
      await sendCommand(deviceId, type, payload);
      toast.success(`${friendlyCommand(type)} sent`);
      onDone?.();
    } catch (e) {
      toast.error(`Couldn't send ${friendlyCommand(type)}`);
      onError?.(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-rm-line bg-rm-panel p-5 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-rm-ink">Device controls</h3>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rm-green-soft text-rm-green-deep">
          Device Owner
        </span>
      </div>
      <p className="text-sm text-rm-slate mb-4">
        Remote actions on the device — all silent, no user prompt.
      </p>

      <Group label="Power">
        <Btn
          label="Reboot"
          icon={<RebootIcon size={16} />}
          busy={busy === 'reboot'}
          onClick={() => run('reboot', 'REBOOT')}
        />
      </Group>

      <Group label="Camera">
        <Toggle
          label="Camera"
          onLabel="Enabled"
          offLabel="Disabled"
          busy={busy?.startsWith('cam') ?? false}
          onOn={() => run('cam-on', 'SET_CAMERA_DISABLED', { disabled: false })}
          onOff={() => run('cam-off', 'SET_CAMERA_DISABLED', { disabled: true })}
        />
      </Group>

      <Group label="Install app (APK URL)" stack>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="https://…/app.apk"
            value={apkUrl}
            onChange={(e) => setApkUrl(e.target.value)}
          />
          <Btn
            label="Install"
            icon={<InstallIcon size={16} />}
            busy={busy === 'apk'}
            disabled={!/^https?:\/\/.+/.test(apkUrl.trim())}
            variant="primary"
            onClick={() => run('apk', 'INSTALL_APK', { url: apkUrl.trim() })}
          />
        </div>
      </Group>

      <Group label="Push update — OTA (APK URL)" stack>
        <p className="text-xs text-rm-slate">
          Upgrades an installed app in place (same signature) — e.g. a new RMSoft agent build.
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="https://…/app-v2.apk"
            value={updateUrl}
            onChange={(e) => setUpdateUrl(e.target.value)}
          />
          <Btn
            label="Push update"
            icon={<RefreshIcon size={16} />}
            busy={busy === 'ota'}
            disabled={!/^https?:\/\/.+/.test(updateUrl.trim())}
            variant="primary"
            onClick={() => run('ota', 'UPDATE_APP', { url: updateUrl.trim() })}
          />
        </div>
      </Group>
    </section>
  );
}

function Group({
  label,
  children,
  stack = false,
}: {
  label: string;
  children: React.ReactNode;
  stack?: boolean;
}) {
  return (
    <div className="py-3 border-t border-rm-line first:border-t-0 first:pt-0">
      <div className="text-xs font-medium uppercase tracking-wider text-rm-slate mb-2">
        {label}
      </div>
      <div className={stack ? 'space-y-2' : 'flex flex-wrap gap-2'}>{children}</div>
    </div>
  );
}

function Btn({
  label,
  onClick,
  icon,
  busy = false,
  disabled = false,
  variant = 'neutral',
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'neutral' | 'primary';
}) {
  const cls =
    variant === 'primary'
      ? 'bg-rm-green text-white hover:bg-rm-green-deep'
      : 'border border-rm-line bg-rm-panel text-rm-ink hover:bg-rm-canvas hover:border-rm-green/30';
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      {icon && !busy && <span className="shrink-0">{icon}</span>}
      {busy ? 'Sending…' : label}
    </button>
  );
}

function Toggle({
  label,
  onLabel,
  offLabel,
  onOn,
  onOff,
  busy,
}: {
  label: string;
  onLabel: string;
  offLabel: string;
  onOn: () => void;
  onOff: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center justify-between w-full sm:w-auto gap-3 rounded-lg border border-rm-line px-3 py-2">
      <span className="text-sm text-rm-ink">{label}</span>
      <div className="inline-flex rounded-md overflow-hidden border border-rm-line">
        <button
          onClick={onOn}
          disabled={busy}
          className="px-2.5 py-1 text-xs font-medium text-rm-slate hover:bg-rm-green-soft hover:text-rm-green-deep transition disabled:opacity-40"
        >
          {onLabel}
        </button>
        <button
          onClick={onOff}
          disabled={busy}
          className="px-2.5 py-1 text-xs font-medium text-rm-slate border-l border-rm-line hover:bg-rm-danger-soft hover:text-rm-danger transition disabled:opacity-40"
        >
          {offLabel}
        </button>
      </div>
    </div>
  );
}
