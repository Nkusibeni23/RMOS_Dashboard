"use client";

import { useState, useEffect, useCallback } from "react";
import {
  sendCommand,
  uploadApk,
  listApks,
  deleteApk,
  ApiError,
} from "@/lib/api";
import type { UploadedApk } from "@/lib/api";
import type { CommandType } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { friendlyCommand } from "@/lib/labels";
import { RebootIcon, InstallIcon, RefreshIcon } from "@/components/icons";
import { ConfirmModal } from "@/components/ConfirmModal";

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
  const [apkUrl, setApkUrl] = useState("");
  const [updateUrl, setUpdateUrl] = useState("");
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadName, setUploadName] = useState("");
  const [apks, setApks] = useState<UploadedApk[]>([]);
  const [pendingDelete, setPendingDelete] = useState<UploadedApk | null>(null);

  // The uploaded-APK library (history). Best-effort — a load failure just shows an empty list.
  const loadApks = useCallback(async () => {
    try {
      setApks(await listApks());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadApks();
  }, [loadApks]);

  // Re-install or push-update an already-uploaded APK straight from the library — no re-upload.
  async function fromLibrary(
    apk: UploadedApk,
    type: "INSTALL_APK" | "UPDATE_APP",
  ) {
    setBusy(`${type}-${apk.filename}`);
    try {
      await sendCommand(deviceId, type, { url: apk.url });
      toast.success(`${friendlyCommand(type)} sent for ${apk.filename}`);
      onDone?.();
    } catch (e) {
      toast.error(`Couldn't send ${friendlyCommand(type)}`);
      onError?.(String(e));
    } finally {
      setBusy(null);
    }
  }

  // Deletion goes through a confirmation modal (best UX — no accidental data loss, no ugly
  // browser confirm()). The Delete button opens the modal; this runs on confirm.
  async function confirmDeleteApk() {
    const apk = pendingDelete;
    if (!apk) return;
    setBusy(`del-${apk.filename}`);
    try {
      await deleteApk(apk.filename);
      toast.success(`Removed ${apk.filename}`);
      setPendingDelete(null);
      loadApks();
    } catch (e) {
      toast.error(`Couldn't remove ${apk.filename}`);
      onError?.(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function run(
    key: string,
    type: CommandType,
    payload?: Record<string, unknown>,
  ) {
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

  // Upload an APK file → the server hosts it → push INSTALL_APK with that URL. One click = installed.
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked later
    if (!file) return;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    setUploadName(`${file.name} · ${sizeMB} MB`);
    setUploadPct(0);
    setBusy("upload");
    try {
      const { url } = await uploadApk(file, setUploadPct);
      setApkUrl(url);
      setBusy("installing");
      await sendCommand(deviceId, "INSTALL_APK", { url });
      toast.success(`${file.name} uploaded — installing on the device`);
      onDone?.();
      loadApks();
    } catch (err) {
      toast.error(uploadErrorMessage(err));
      onError?.(String(err));
    } finally {
      setBusy(null);
      setUploadPct(0);
      setUploadName("");
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
        Remote actions on the device all silent, no user prompt.
      </p>

      <Group label="Power">
        <Btn
          label="Reboot"
          icon={<RebootIcon size={16} />}
          busy={busy === "reboot"}
          onClick={() => run("reboot", "REBOOT")}
        />
      </Group>

      <Group label="Camera">
        <Toggle
          label="Camera"
          onLabel="Enabled"
          offLabel="Disabled"
          busy={busy?.startsWith("cam") ?? false}
          onOn={() => run("cam-on", "SET_CAMERA_DISABLED", { disabled: false })}
          onOff={() =>
            run("cam-off", "SET_CAMERA_DISABLED", { disabled: true })
          }
        />
      </Group>

      <Group label="Install app" stack>
        <p className="text-xs text-rm-slate">
          Upload an APK it uploads, then installs silently on the device.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium cursor-pointer transition bg-rm-green text-white hover:bg-rm-green-deep ${
              busy === "upload" || busy === "installing"
                ? "opacity-60 pointer-events-none"
                : ""
            }`}
          >
            <InstallIcon size={16} />
            {busy === "upload"
              ? `Uploading ${uploadPct}%`
              : busy === "installing"
                ? "Installing…"
                : "Upload APK"}
            <input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              className="hidden"
              disabled={busy === "upload" || busy === "installing"}
              onChange={handleUpload}
            />
          </label>
          <span className="text-xs text-rm-slate">or paste a direct URL:</span>
        </div>

        {(busy === "upload" || busy === "installing") && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-rm-slate">
              <span className="truncate pr-2">{uploadName}</span>
              <span className="tabular-nums shrink-0">
                {busy === "installing"
                  ? "Sending to device…"
                  : uploadPct >= 100
                    ? "Finishing…"
                    : `${uploadPct}%`}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-rm-line overflow-hidden">
              <div
                className={`h-full bg-rm-green transition-all duration-200 ${
                  busy === "installing" ? "animate-pulse w-full" : ""
                }`}
                style={
                  busy === "upload" ? { width: `${uploadPct}%` } : undefined
                }
              />
            </div>
          </div>
        )}
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
            busy={busy === "apk"}
            disabled={!/^https?:\/\/.+/.test(apkUrl.trim())}
            variant="primary"
            onClick={() => run("apk", "INSTALL_APK", { url: apkUrl.trim() })}
          />
        </div>
      </Group>

      <Group label="Push update OTA (APK URL)" stack>
        <p className="text-xs text-rm-slate">
          Upgrades an installed app in place (same signature) e.g. a new RMSoft
          agent build.
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="https://…/app-v2.apk"
            value={updateUrl}
            onChange={(e) => setUpdateUrl(e.target.value)}
          />
          <Btn
            label="Push"
            icon={<RefreshIcon size={16} />}
            busy={busy === "ota"}
            disabled={!/^https?:\/\/.+/.test(updateUrl.trim())}
            variant="primary"
            onClick={() => run("ota", "UPDATE_APP", { url: updateUrl.trim() })}
          />
        </div>
      </Group>

      <Group
        label={`Uploaded apps history${apks.length ? ` (${apks.length})` : ""}`}
        stack
      >
        <p className="text-xs text-rm-slate">
          Every APK you’ve uploaded. Re-install or push-update any of them to
          this device no re-upload needed.
        </p>
        {apks.length === 0 ? (
          <p className="text-xs text-rm-slate italic">
            Nothing uploaded yet use “Upload APK” above and it shows up here.
          </p>
        ) : (
          <ul className="space-y-2">
            {apks.map((apk) => (
              <li
                key={apk.filename}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rm-line px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm text-rm-ink truncate">
                    {apk.filename}
                  </div>
                  <div className="text-[11px] text-rm-slate">
                    {(apk.size / (1024 * 1024)).toFixed(1)} MB
                    {apk.uploadedAt
                      ? ` · ${new Date(apk.uploadedAt).toLocaleString()}`
                      : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <MiniBtn
                    label="Install"
                    busy={busy === `INSTALL_APK-${apk.filename}`}
                    onClick={() => fromLibrary(apk, "INSTALL_APK")}
                  />
                  <MiniBtn
                    label="Update"
                    busy={busy === `UPDATE_APP-${apk.filename}`}
                    onClick={() => fromLibrary(apk, "UPDATE_APP")}
                  />
                  <MiniBtn
                    label="Delete"
                    danger
                    busy={busy === `del-${apk.filename}`}
                    onClick={() => setPendingDelete(apk)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Group>

      <ConfirmModal
        open={pendingDelete !== null}
        danger
        title="Delete this app?"
        confirmLabel="Delete"
        busy={busy === `del-${pendingDelete?.filename}`}
        onConfirm={confirmDeleteApk}
        onCancel={() => setPendingDelete(null)}
      >
        <p>
          Remove{" "}
          <span className="font-medium text-rm-fog">
            {pendingDelete?.filename}
          </span>{" "}
          ({pendingDelete ? (pendingDelete.size / (1024 * 1024)).toFixed(1) : 0}{" "}
          MB) from the server library.
        </p>
        <p className="text-rm-slate">
          It’ll no longer be available to install on devices. Apps already
          installed on phones stay put. This can’t be undone.
        </p>
      </ConfirmModal>
    </section>
  );
}

function MiniBtn({
  label,
  onClick,
  busy = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  const cls = danger
    ? "border-rm-line text-rm-danger hover:bg-rm-danger-soft"
    : "border-rm-line text-rm-ink hover:bg-rm-green-soft hover:text-rm-green-deep";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`px-2.5 py-1 rounded-md border text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      {busy ? "…" : label}
    </button>
  );
}

/** Turn an upload failure into a message that actually tells the user what to do. */
function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 413)
      return "File too large for the server — an admin needs to raise the upload limit";
    if (err.status === 401)
      return "Session expired — sign out and back in, then retry";
    if (err.status === 500)
      return "Server couldn’t save the file — the uploads folder may be misconfigured";
    if (err.status === 0)
      return "Upload interrupted — check your connection and retry";
  }
  return "Upload failed — make sure it’s a valid .apk and try again";
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
      <div className={stack ? "space-y-2" : "flex flex-wrap gap-2"}>
        {children}
      </div>
    </div>
  );
}

function Btn({
  label,
  onClick,
  icon,
  busy = false,
  disabled = false,
  variant = "neutral",
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  busy?: boolean;
  disabled?: boolean;
  variant?: "neutral" | "primary";
}) {
  const cls =
    variant === "primary"
      ? "bg-rm-green text-white hover:bg-rm-green-deep"
      : "border border-rm-line bg-rm-panel text-rm-ink hover:bg-rm-canvas hover:border-rm-green/30";
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      {icon && !busy && <span className="shrink-0">{icon}</span>}
      {busy ? "Sending…" : label}
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
