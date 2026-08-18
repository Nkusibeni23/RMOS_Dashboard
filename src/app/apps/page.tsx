'use client';

/**
 * Apps — fleet-level app management.
 *
 * Replaces the per-device upload that lived in KioskPanel, where installing one app on twenty
 * phones meant uploading the same APK twenty times with no record of who got what. Here an APK is
 * uploaded once and installed across a client's fleet in one action.
 *
 * Deliberately client-scoped rather than device-scoped: "PatrolApp → Company A" is the unit an
 * admin actually thinks in, and it's the shape a real assignment model will need later. With one
 * client today the picker just preselects it and stays out of the way.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listApks,
  uploadApk,
  deleteApk,
  listDevices,
  listOwners,
  sendCommand,
  ApiError,
  type UploadedApk,
} from '@/lib/api';
import type { Device, Owner } from '@/lib/types';
import { ONLINE_WINDOW_MS } from '@/lib/types';
import { TopBar } from '@/components/TopBar';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';

/** Same rule the fleet list uses, so "online" means one thing across the dashboard. */
function isOnline(d: Device) {
  return (
    !!d.lastSeenAt && Date.now() - new Date(d.lastSeenAt).getTime() < ONLINE_WINDOW_MS
  );
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Strip the server's uniqueness prefix so the list reads like the file the admin picked. */
function prettyName(filename: string) {
  return filename.replace(/^\d+[-_]/, '');
}

export default function AppsPage() {
  const router = useRouter();
  const toast = useToast();

  const [apks, setApks] = useState<UploadedApk[] | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);

  const [uploadPct, setUploadPct] = useState(0);
  const [uploadName, setUploadName] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [installTarget, setInstallTarget] = useState<UploadedApk | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UploadedApk | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, d, o] = await Promise.all([listApks(), listDevices(), listOwners()]);
      setApks(a);
      setDevices(d);
      setOwners(o);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace('/login');
        return;
      }
      toast.error("Couldn't load apps");
      setApks([]);
    }
  }, [router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.apk')) {
      toast.error('That file is not an APK');
      return;
    }
    setUploadName(`${file.name} · ${formatSize(file.size)}`);
    setUploadPct(0);
    try {
      await uploadApk(file, setUploadPct);
      toast.success(`${file.name} uploaded`);
      await load();
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.status === 413
          ? 'That APK is too large for the server upload limit'
          : "Upload failed — the file wasn't stored",
      );
    } finally {
      setUploadName('');
      setUploadPct(0);
    }
  }

  return (
    <div className="min-h-screen bg-rm-canvas">
      <TopBar />

      <main className="max-w-6xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-rm-ink">Apps</h1>
        <p className="text-sm text-rm-slate mt-1 mb-6">
          Upload an APK once, then install it across a client&apos;s fleet no need to repeat it
          per device.
        </p>

        {/* Upload. Drag-and-drop with a click fallback: dropping a build is the common path. */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => !uploadName && fileInput.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
            dragging
              ? 'border-rm-green bg-rm-green-soft'
              : 'border-rm-line bg-rm-panel hover:border-rm-green/50'
          }`}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              handleFile(f);
            }}
          />
          {uploadName ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-rm-ink">{uploadName}</p>
              <div className="h-2 rounded-full bg-rm-panel-2 overflow-hidden max-w-sm mx-auto">
                <div
                  className="h-full bg-rm-green transition-all"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <p className="text-xs text-rm-slate">{uploadPct}% uploaded</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-rm-ink">
                Drop an APK here, or click to choose
              </p>
              <p className="text-xs text-rm-slate mt-1">
                Uploading only stores the file. Nothing installs until you choose a fleet.
              </p>
            </>
          )}
        </section>

        {/* Library */}
        <h2 className="font-semibold text-rm-ink mt-8 mb-3">Uploaded apps</h2>

        {apks == null ? (
          <div className="rounded-2xl border border-rm-line bg-rm-panel p-8 text-center text-sm text-rm-slate">
            Loading…
          </div>
        ) : apks.length === 0 ? (
          <div className="rounded-2xl border border-rm-line bg-rm-panel p-8 text-center">
            <p className="text-sm text-rm-slate">
              No apps uploaded yet. Drop your first APK above.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {apks.map((apk) => (
              <li
                key={apk.filename}
                className="rounded-2xl border border-rm-line bg-rm-panel p-4 flex items-center gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-rm-ink truncate">{prettyName(apk.filename)}</p>
                  <p className="text-xs text-rm-slate mt-0.5">
                    {formatSize(apk.size)}
                    {apk.uploadedAt
                      ? ` · uploaded ${new Date(apk.uploadedAt).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <button
                  onClick={() => setInstallTarget(apk)}
                  className="shrink-0 px-4 py-2 rounded-lg bg-rm-green text-white text-sm font-medium hover:bg-rm-green-deep transition"
                >
                  Install to fleet
                </button>
                <button
                  onClick={() => setPendingDelete(apk)}
                  className="shrink-0 px-3 py-2 rounded-lg border border-rm-line text-rm-slate text-sm hover:text-rm-danger hover:border-rm-danger transition"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {installTarget && (
        <InstallModal
          apk={installTarget}
          devices={devices}
          owners={owners}
          onClose={() => setInstallTarget(null)}
        />
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title="Delete this APK?"
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const target = pendingDelete;
          if (!target) return;
          setPendingDelete(null);
          try {
            await deleteApk(target.filename);
            toast.success('APK deleted');
            load();
          } catch {
            toast.error("Couldn't delete that APK");
          }
        }}
      >
        <p>
          <span className="font-medium text-rm-ink">
            {pendingDelete ? prettyName(pendingDelete.filename) : ''}
          </span>{' '}
          will be removed from the server. Devices that already installed it keep it — this only
          stops new installs.
        </p>
      </ConfirmModal>
    </div>
  );
}

/**
 * Choosing who gets the app.
 *
 * Shows the data cost before the button rather than after the bill: these are eSIM devices on
 * mobile data, and one 60MB app across a fleet is real money. The offline count is surfaced for
 * the same reason — those installs are queued, not lost, and saying so prevents a second attempt.
 */
function InstallModal({
  apk,
  devices,
  owners,
  onClose,
}: {
  apk: UploadedApk;
  devices: Device[];
  owners: Owner[];
  onClose: () => void;
}) {
  const toast = useToast();
  // One client today, so preselect it — a picker with a single option is friction, not a choice.
  const [ownerId, setOwnerId] = useState<string>(owners[0]?.id ?? '');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const inClient = devices.filter((d) => d.assignedOwnerId === ownerId);
  const targets = onlineOnly ? inClient.filter(isOnline) : inClient;
  const offlineCount = inClient.length - inClient.filter(isOnline).length;
  const totalBytes = apk.size * targets.length;

  async function install() {
    setProgress({ done: 0, total: targets.length });
    let failed = 0;
    // Sequential on purpose: a browser firing hundreds of parallel requests at the API is a
    // self-inflicted thundering herd, and the progress count stays truthful this way.
    for (let i = 0; i < targets.length; i++) {
      try {
        await sendCommand(targets[i].id, 'INSTALL_APK', { url: apk.url });
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: targets.length });
    }
    setProgress(null);
    if (failed === 0) {
      toast.success(
        `Queued on ${targets.length} device${targets.length === 1 ? '' : 's'}${
          offlineCount && !onlineOnly ? ` — ${offlineCount} will install on next connect` : ''
        }`,
      );
    } else {
      toast.error(`${targets.length - failed} queued, ${failed} could not be reached`);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-rm-panel border border-rm-line p-6">
        <h3 className="font-semibold text-rm-ink">Install {prettyName(apk.filename)}</h3>

        <label className="block text-sm text-rm-slate mt-5 mb-1">Client</label>
        <select
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          className="w-full rounded-lg border border-rm-line bg-white px-3 py-2 text-sm text-rm-ink"
        >
          {owners.length === 0 && <option value="">No clients yet</option>}
          {owners.map((o) => {
            const n = devices.filter((d) => d.assignedOwnerId === o.id).length;
            return (
              <option key={o.id} value={o.id}>
                {o.name} ({n} device{n === 1 ? '' : 's'})
              </option>
            );
          })}
        </select>

        <label className="flex items-center gap-2 text-sm text-rm-ink mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => setOnlineOnly(e.target.checked)}
          />
          Only devices online now
        </label>

        <div className="mt-5 rounded-xl bg-rm-canvas border border-rm-line p-3 text-sm">
          <p className="text-rm-ink">
            {formatSize(apk.size)} × {targets.length} device
            {targets.length === 1 ? '' : 's'} ={' '}
            <span className="font-semibold">{formatSize(totalBytes)}</span> total
          </p>
          {offlineCount > 0 && !onlineOnly && (
            <p className="text-rm-warn mt-1">
              {offlineCount} offline — queued, installs on next connect
            </p>
          )}
          <p className="text-rm-slate mt-1 text-xs">
            Devices on mobile data download this over their eSIM bundle.
          </p>
        </div>

        {progress && (
          <div className="mt-4">
            <div className="h-2 rounded-full bg-rm-panel-2 overflow-hidden">
              <div
                className="h-full bg-rm-green transition-all"
                style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-rm-slate mt-1">
              Queued {progress.done} of {progress.total}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={!!progress}
            className="px-4 py-2 rounded-lg border border-rm-line text-rm-slate text-sm hover:bg-rm-canvas transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={install}
            disabled={!!progress || targets.length === 0}
            className="px-4 py-2 rounded-lg bg-rm-green text-white text-sm font-medium hover:bg-rm-green-deep transition disabled:opacity-50"
          >
            {progress
              ? 'Queuing…'
              : `Install on ${targets.length} device${targets.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
