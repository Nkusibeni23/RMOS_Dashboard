"use client";

import { useEffect, useState } from "react";
import { getLatestRelease, rolloutRelease } from "@/lib/api";
import type { Device, OsRelease } from "@/lib/types";
import { useToast } from "@/components/Toast";

/**
 * Per-device software (RMSoft OS) update card. Shows the phone's current build, compares it to the
 * latest published release, and — when it's behind — offers a one-click OTA push to just this device.
 * Mirrors the iPhone "Software Update" screen. Fleet-wide rollout lives on the Releases page.
 */
export function SoftwareUpdateCard({
  device,
  onError,
  onDone,
}: {
  device: Device;
  onError?: (msg: string) => void;
  onDone?: () => void;
}) {
  const toast = useToast();
  const [latest, setLatest] = useState<OsRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getLatestRelease()
      .then(setLatest)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const current = device.romBuild ?? null;
  const upToDate = latest != null && current != null && current === latest.version;
  const updateAvailable = latest != null && current !== latest.version;

  async function pushUpdate() {
    if (!latest) return;
    setBusy(true);
    try {
      await rolloutRelease(latest.id, device.id);
      toast.success(`Update to ${latest.version} sent to this device`);
      onDone?.();
    } catch (e) {
      toast.error("Couldn't push the update");
      onError?.(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-rm-line bg-rm-panel p-5 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-rm-ink">Software update</h3>
        {updateAvailable && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rm-green-soft text-rm-green-deep">
            Update available
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-4">
        <div className="min-w-0 text-sm">
          <p className="text-rm-slate">
            Current build:{" "}
            <span className="font-mono text-rm-ink">
              {current ?? "not reported yet"}
            </span>
          </p>
          {loading ? (
            <p className="text-rm-slate mt-0.5">Checking for updates…</p>
          ) : latest == null ? (
            <p className="text-rm-slate mt-0.5">No releases published yet.</p>
          ) : upToDate ? (
            <p className="text-rm-green-deep mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rm-green" />
              Up to date
            </p>
          ) : (
            <p className="text-rm-ink mt-0.5">
              Latest:{" "}
              <span className="font-mono text-rm-green-deep">
                {latest.version}
              </span>
              {latest.mandatory && (
                <span className="ml-2 text-[11px] font-medium text-rm-warn">
                  mandatory
                </span>
              )}
            </p>
          )}
        </div>

        {updateAvailable && (
          <button
            onClick={pushUpdate}
            disabled={busy}
            className="shrink-0 px-4 py-2 rounded-lg bg-rm-green text-white font-medium text-sm hover:bg-rm-green-deep disabled:opacity-50 transition"
          >
            {busy ? "Sending…" : `Update to ${latest?.version}`}
          </button>
        )}
      </div>

      {updateAvailable && latest?.notes && (
        <div className="mt-3 border-t border-rm-line pt-3">
          <p className="text-xs font-medium text-rm-slate uppercase tracking-wider mb-1">
            What's new
          </p>
          <p className="text-sm text-rm-ink whitespace-pre-line">
            {latest.notes}
          </p>
        </div>
      )}
    </section>
  );
}
