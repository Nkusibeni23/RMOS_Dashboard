"use client";

import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  getDevice,
  getToken,
  markFound,
  sendCommand,
  clearQueue,
  listOwners,
  assignDevice,
} from "@/lib/api";
import type {
  CommandStatus,
  CommandType,
  Device,
  LocationPing,
  Owner,
} from "@/lib/types";
import { ONLINE_WINDOW_MS } from "@/lib/types";
import { TopBar } from "@/components/TopBar";
import { StatusPill } from "@/components/StatusPill";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Select } from "@/components/Select";
import { KioskPanel } from "@/components/KioskPanel";
import { RadioLockdownControl } from "@/components/RadioLockdownControl";
import { EsimOnlyControl } from "@/components/EsimOnlyControl";
import { SoftwareUpdateCard } from "@/components/SoftwareUpdateCard";
import { DeviceTelemetry } from "@/components/DeviceTelemetry";
import { LocationHistory } from "@/components/LocationHistory";
import { DeviceInfoCard } from "@/components/DeviceInfoCard";
import { useToast } from "@/components/Toast";
import { usePolling } from "@/lib/usePolling";
import { friendlyCommand } from "@/lib/labels";
import {
  LocateIcon,
  RingIcon,
  LockIcon,
  UnlockIcon,
  MessageIcon,
  WipeIcon,
  OrgIcon,
  PersonIcon,
  AlertIcon,
} from "@/components/icons";

const DeviceMap = dynamic(() => import("@/components/DeviceMap"), {
  ssr: false,
});

const inputCls = "input";

type TabKey = "overview" | "actions" | "security" | "kiosk" | "history";

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const toast = useToast();

  const [device, setDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<CommandType | "MARK_FOUND" | null>(null);
  const [message, setMessage] = useState(
    "If found, please call +250-xxx-xxx-xxx",
  );
  const [ownerName, setOwnerName] = useState("");
  const [wipe, setWipe] = useState<{ everything: boolean } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [locating, setLocating] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  // Which ping the map + history list are focused on. null = follow the newest fix.
  const [focusedPing, setFocusedPing] = useState<string | null>(null);

  const seenStatus = useRef<Map<string, CommandStatus>>(new Map());
  const seeded = useRef(false);
  const locateBaseline = useRef<string | null>(null);
  const locateStart = useRef<number>(0);

  const refresh = useCallback(async () => {
    try {
      setDevice(await getDevice(id));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(String(e));
    }
  }, [id, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    refresh();
    listOwners()
      .then(setOwners)
      .catch(() => {});
  }, [refresh, router]);
  usePolling(refresh, 5000);

  async function handleAssign(ownerId: string | null) {
    setAssigning(true);
    try {
      await assignDevice(id, ownerId);
      toast.success(ownerId ? "Assigned to client" : "Unassigned");
      await refresh();
    } catch (e) {
      toast.error("Couldn't change the client");
      setError(String(e));
    } finally {
      setAssigning(false);
    }
  }

  useEffect(() => {
    if (!device?.commands) return;
    const first = !seeded.current;
    for (const c of device.commands) {
      const prev = seenStatus.current.get(c.id);
      if (!first && prev && prev !== c.status) {
        if (c.status === "ACKED") {
          toast.success(`${friendlyCommand(c.type)} acknowledged`);
        } else if (c.status === "FAILED") {
          toast.error(
            `${friendlyCommand(c.type)} failed${
              c.errorMessage ? `: ${c.errorMessage}` : ""
            }`,
          );
        }
      }
      seenStatus.current.set(c.id, c.status);
    }
    seeded.current = true;
  }, [device, toast]);

  // Resolve the "Locating…" state: clear it when a fresh location arrives, or time out after 35s.
  useEffect(() => {
    if (!locating) return;
    const newest = device?.locations?.[0];
    if (newest && newest.id !== locateBaseline.current) {
      setLocating(false);
      setFocusedPing(null); // a fix you just asked for should be the one on screen
      const acc = newest.accuracyM
        ? ` · ±${Math.round(newest.accuracyM)}m`
        : "";
      toast.success(`Fresh location${acc}`);
      return;
    }
    if (locateStart.current && Date.now() - locateStart.current > 35000) {
      setLocating(false);
      toast.error("No fresh fix yet, the phone may be offline or indoors");
    }
  }, [locating, device, toast]);

  async function issue(type: CommandType, payload?: Record<string, unknown>) {
    if (!device) return;
    setBusy(type);
    try {
      await sendCommand(device.id, type, payload);
      toast.success(
        `${friendlyCommand(type)} sent to ${device.model ?? "device"}`,
      );
      await refresh();
    } catch (e) {
      toast.error(`Couldn't send ${friendlyCommand(type)}`);
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function locate() {
    if (!device) return;
    locateBaseline.current = device.locations?.[0]?.id ?? null;
    locateStart.current = Date.now();
    setLocating(true);
    try {
      await sendCommand(device.id, "LOCATE_NOW");
      toast.success("Locating… waiting for a fresh fix");
      await refresh();
    } catch (e) {
      toast.error("Couldn't send Locate");
      setError(String(e));
      setLocating(false);
    }
  }

  async function confirmWipe() {
    if (!wipe) return;
    const payload: Record<string, unknown> = { confirm: true };
    if (wipe.everything) payload.everything = true;
    await issue("WIPE", payload);
    setWipe(null);
  }

  async function onMarkFound() {
    if (!device) return;
    setBusy("MARK_FOUND");
    try {
      await markFound(device.id);
      toast.success("Device marked as found");
      await refresh();
    } catch (e) {
      toast.error("Couldn't mark as found");
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  if (!device) {
    return (
      <>
        <TopBar />
        <main className="max-w-6xl mx-auto px-5 py-8">
          {error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <p className="text-rm-graphite">Loading…</p>
          )}
        </main>
      </>
    );
  }

  const online =
    !!device.lastSeenAt &&
    Date.now() - new Date(device.lastSeenAt).getTime() < ONLINE_WINDOW_MS;

  const queued = (device.commands ?? []).filter(
    (c) => !c.ackedAt && (c.status === "PENDING" || c.status === "SENT"),
  );

  async function handleClearQueue() {
    setClearing(true);
    try {
      const { cleared } = await clearQueue(id);
      toast.success(
        cleared
          ? `Cleared ${cleared} queued command${cleared > 1 ? "s" : ""}`
          : "Queue was already empty",
      );
      await refresh();
      setConfirmClear(false);
    } catch (e) {
      toast.error("Couldn't clear the queue");
      setError(String(e));
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      <TopBar />
      <main className="max-w-7xl mx-auto px-5 py-8 animate-fade-up">
        <div className="space-y-5">
          {/* Anti-theft alert banner */}
          {device.lastAlertType && (
            <div className="flex items-start gap-3 rounded-2xl border border-rm-danger/30 bg-rm-danger-soft p-4">
              <span className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-white text-rm-danger">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-rm-danger">
                  {device.lastAlertType === "SIM_SWAP"
                    ? "SIM swap detected, phone auto-locked"
                    : device.lastAlertType === "TAMPER"
                      ? "Tamper attempt, device flagged"
                      : `Alert: ${device.lastAlertType}`}
                </p>
                <p className="text-sm text-rm-danger/80">
                  {device.lastAlertInfo ?? "Possible theft"}
                  {device.lastAlertAt
                    ? ` · ${new Date(device.lastAlertAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
            </div>
          )}

          {/* Offline command queue */}
          {!online && queued.length > 0 && (
            <div className="rounded-2xl border border-rm-warn/30 bg-rm-warn-soft p-4">
              <div className="flex items-start gap-3">
                <span className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-white text-rm-warn">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 8v4l3 2" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-rm-warn">
                    <span className="font-semibold">
                      {queued.length} command{queued.length > 1 ? "s" : ""}{" "}
                      waiting
                    </span>{" "}
                    while the phone is offline.{" "}
                    {queued.length > 1 ? "They" : "It"} deliver automatically
                    when it reconnects.
                  </p>
                </div>
                <button
                  onClick={() => setConfirmClear(true)}
                  disabled={clearing}
                  className="shrink-0 self-start px-3 py-1.5 rounded-lg border border-rm-warn/40 text-rm-warn text-xs font-medium hover:bg-white/60 transition disabled:opacity-50"
                >
                  {clearing ? "Clearing…" : "Clear queue"}
                </button>
              </div>

              {/* What's actually queued — command + when it was sent */}
              <ul className="mt-3 space-y-1 border-t border-rm-warn/20 pt-3">
                {queued.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-medium text-rm-warn">
                      {friendlyCommand(c.type)}
                    </span>
                    <span className="text-rm-warn/70 tabular-nums shrink-0">
                      {new Date(c.sentAt ?? c.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-5 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6 lg:items-start">
          {/* LEFT: sticky device identity + navigation */}
          <aside className="lg:sticky lg:top-6 space-y-4">
            {/* Identity card */}
            <header className="rounded-2xl border border-rm-line bg-rm-panel p-6 shadow-card">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight text-rm-fog truncate">
                    {device.model ?? "Device"}
                  </h2>
                  <StatusPill status={device.status} />
                </div>
                <p className="text-sm text-rm-graphite font-mono mt-1">
                  {device.serialNumber}
                </p>
                {device.hardwareSerial && (
                  <p className="text-xs text-rm-graphite/70 font-mono">
                    HW serial · {device.hardwareSerial}
                  </p>
                )}
                {device.ownerLabel && (
                  <p className="text-sm text-rm-fog mt-1">
                    Owner · {device.ownerLabel}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 text-sm text-rm-graphite">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      online ? "bg-rm-green" : "bg-rm-graphite/50"
                    }`}
                  />
                  {online
                    ? "Online now"
                    : `Last seen ${
                        device.lastSeenAt
                          ? new Date(device.lastSeenAt).toLocaleString()
                          : "never"
                      }`}
                </div>
                <DeviceTelemetry device={device} />
              </div>
              {device.status === "LOST" && (
                <button
                  onClick={onMarkFound}
                  disabled={busy !== null}
                  className="shrink-0 bg-rm-green text-rm-black font-medium px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50 transition"
                >
                  Mark found
                </button>
              )}
            </header>

            <TabNav tab={tab} onChange={setTab} vertical />
          </aside>

          {/* RIGHT: active tab content */}
          <div className="space-y-5 mt-5 lg:mt-0">
            {error && (
              <div className="text-sm text-rm-danger bg-rm-danger-soft border border-rm-danger/20 rounded-xl p-3">
                {error}
              </div>
            )}

            {tab === "overview" && (
              <div className="space-y-5">
                {/* Assigned client (owner) */}
                <section className="rounded-2xl border border-rm-line bg-rm-panel p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span className="text-rm-slate shrink-0">Client:</span>
                    {device.assignedOwner ? (
                      <span className="flex items-center gap-1.5 font-medium text-rm-fog truncate">
                        <span className="shrink-0 text-rm-slate">
                          {device.assignedOwner.type === "ORGANIZATION" ? (
                            <OrgIcon size={15} />
                          ) : (
                            <PersonIcon size={15} />
                          )}
                        </span>
                        <span className="truncate">
                          {device.assignedOwner.name}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-medium text-rm-warn">
                        <AlertIcon size={15} />
                        Unassigned
                      </span>
                    )}
                    {device.assignedOwner && (
                      <span className="text-xs text-rm-graphite hidden sm:inline">
                        shown on the phone as “managed by”
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={device.assignedOwnerId ?? ""}
                      disabled={assigning}
                      onChange={(v) => handleAssign(v || null)}
                      placeholder="Unassigned"
                      aria-label="Assign to client"
                      className="min-w-[200px]"
                      options={owners.map((o) => ({
                        value: o.id,
                        label: o.name,
                        icon:
                          o.type === "ORGANIZATION" ? (
                            <OrgIcon size={15} />
                          ) : (
                            <PersonIcon size={15} />
                          ),
                      }))}
                    />
                    {assigning && (
                      <span className="text-xs text-rm-slate">saving…</span>
                    )}
                  </div>
                </section>

                {/* Map */}
                <section className="rounded-2xl border border-rm-line bg-rm-panel p-5 shadow-card">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="font-semibold text-rm-fog">Location</h3>
                      {locating ? (
                        <span className="flex items-center gap-2 text-xs font-medium text-rm-green">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-rm-green opacity-75 animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-rm-green" />
                          </span>
                          Locating…
                        </span>
                      ) : device.locations?.[0] ? (
                        <span className="text-xs text-rm-slate truncate">
                          Updated{" "}
                          {new Date(
                            device.locations[0].reportedAt,
                          ).toLocaleTimeString()}
                          {device.locations[0].source
                            ? ` · ${device.locations[0].source}`
                            : ""}
                          {" · "}
                          <FixAge ping={device.locations[0]} />
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Viewing an older fix — one click back to live */}
                      {focusedPing &&
                        focusedPing !== device.locations?.[0]?.id && (
                          <button
                            onClick={() => setFocusedPing(null)}
                            className="px-3 py-1.5 rounded-lg border border-rm-line text-rm-slate text-xs font-medium hover:bg-rm-canvas hover:text-rm-ink transition"
                          >
                            Back to latest
                          </button>
                        )}
                      <button
                        onClick={locate}
                        disabled={locating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rm-green/30 bg-rm-green-soft text-rm-green-deep text-xs font-medium hover:bg-rm-green/15 disabled:opacity-50 transition"
                      >
                        <LocateIcon size={14} />
                        {locating ? "Locating…" : "Locate now"}
                      </button>
                    </div>
                  </div>
                  <DeviceMap
                    locations={device.locations ?? []}
                    selectedId={focusedPing}
                    onSelect={setFocusedPing}
                  />
                </section>

                {/* Ping timeline — click a row to centre the map on that fix */}
                <LocationHistory
                  locations={device.locations ?? []}
                  selectedId={focusedPing}
                  onSelect={setFocusedPing}
                />

                {/* Hardware + enrollment facts */}
                <DeviceInfoCard device={device} />
              </div>
            )}

            {tab === "actions" && (
              <section className="rounded-2xl border border-rm-line bg-rm-panel p-5 shadow-card">
                <h3 className="font-semibold text-rm-fog mb-4">Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ActionButton
                    label={locating ? "Locating…" : "Locate now"}
                    hint="Force fresh GPS ping"
                    icon={<LocateIcon />}
                    onClick={locate}
                    busy={locating}
                  />
                  <ActionButton
                    label="Ring loud"
                    hint="Alarm even on silent"
                    icon={<RingIcon />}
                    onClick={() => issue("RING")}
                    busy={busy === "RING"}
                  />
                  <ActionButton
                    label="Lock screen"
                    hint="Lock immediately"
                    icon={<LockIcon />}
                    onClick={() => issue("LOCK", { message })}
                    busy={busy === "LOCK"}
                    variant="warn"
                  />
                  <ActionButton
                    label="Unlock"
                    hint="Acknowledge a lock"
                    icon={<UnlockIcon />}
                    onClick={() => issue("UNLOCK")}
                    busy={busy === "UNLOCK"}
                  />
                  <ActionButton
                    label="Show message"
                    hint="Heads-up popup on phone"
                    icon={<MessageIcon />}
                    onClick={() => issue("MESSAGE", { message })}
                    busy={busy === "MESSAGE"}
                  />
                  <ActionButton
                    label="Wipe (data)"
                    hint="Factory reset, user data"
                    icon={<WipeIcon />}
                    onClick={() => setWipe({ everything: false })}
                    busy={busy === "WIPE"}
                    variant="danger"
                  />
                  <ActionButton
                    label="Wipe EVERYTHING"
                    hint="Data + SD + eSIM + FRP"
                    icon={<WipeIcon />}
                    onClick={() => setWipe({ everything: true })}
                    busy={busy === "WIPE"}
                    variant="danger"
                  />
                </div>

                <Field label="Lock-screen / banner message (Lock + Show message)">
                  <input
                    className={inputCls}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </Field>

                <Field label="Owner name shows on the lock screen">
                  <div className="flex gap-2">
                    <input
                      className={inputCls}
                      placeholder="e.g. John Doe"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                    <button
                      onClick={() =>
                        issue("SET_OWNER", { name: ownerName, info: message })
                      }
                      disabled={busy !== null || !ownerName.trim()}
                      className="shrink-0 px-4 rounded-lg bg-rm-green text-rm-black font-medium hover:brightness-110 disabled:opacity-40 transition"
                    >
                      {busy === "SET_OWNER" ? "Setting…" : "Set on phone"}
                    </button>
                  </div>
                </Field>
              </section>
            )}

            {tab === "security" && (
              <div className="space-y-5">
                {/* Software update — current build vs latest release, one-click OTA to this device */}
                <SoftwareUpdateCard
                  device={device}
                  onError={setError}
                  onDone={refresh}
                />

                {/* Radio lockdown — keep the device (and a thief) from taking it offline */}
                <RadioLockdownControl
                  device={device}
                  onError={setError}
                  onDone={refresh}
                />

                {/* eSIM-only physical SIM policy (send-only) */}
                <EsimOnlyControl
                  device={device}
                  onError={setError}
                  onDone={refresh}
                />
              </div>
            )}

            {tab === "kiosk" && (
              <KioskPanel
                deviceId={device.id}
                onError={setError}
                onDone={refresh}
              />
            )}

            {tab === "history" && (
              <section className="rounded-2xl border border-rm-line bg-rm-panel shadow-card overflow-hidden">
                <h3 className="font-semibold text-rm-fog px-5 pt-5 pb-3">
                  Recent commands
                </h3>
                {device.commands && device.commands.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-rm-canvas text-rm-slate text-left">
                        <tr>
                          <th className="px-5 py-2 font-medium">When</th>
                          <th className="px-5 py-2 font-medium">Type</th>
                          <th className="px-5 py-2 font-medium">Status</th>
                          <th className="px-5 py-2 font-medium">Acked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {device.commands.map((c) => (
                          <tr key={c.id} className="border-t border-rm-line">
                            <td className="px-5 py-2 text-rm-graphite">
                              {new Date(c.createdAt).toLocaleString()}
                            </td>
                            <td className="px-5 py-2 font-mono text-rm-fog">
                              {c.type}
                            </td>
                            <td className="px-5 py-2">
                              <CmdStatus status={c.status} />
                            </td>
                            <td className="px-5 py-2 text-rm-graphite">
                              {c.ackedAt
                                ? new Date(c.ackedAt).toLocaleString()
                                : "pending"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-rm-graphite px-5 pb-5">
                    No commands yet.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      <ConfirmModal
        open={wipe !== null}
        title={wipe?.everything ? "Wipe EVERYTHING?" : "Wipe device data?"}
        danger
        requireText="WIPE"
        confirmLabel={wipe?.everything ? "Wipe everything" : "Wipe data"}
        busy={busy === "WIPE"}
        onCancel={() => setWipe(null)}
        onConfirm={confirmWipe}
      >
        <p>
          This factory-resets{" "}
          <span className="font-mono text-rm-fog">{device.serialNumber}</span>{" "}
          and erases{" "}
          {wipe?.everything
            ? "ALL data: internal storage, SD card, eSIM profile, and reset-protection."
            : "all user data on internal storage."}
        </p>
        <p className="text-rm-danger font-medium">This cannot be undone.</p>
      </ConfirmModal>

      <ConfirmModal
        open={confirmClear}
        title="Clear the command queue?"
        danger
        confirmLabel="Clear queue"
        busy={clearing}
        onCancel={() => setConfirmClear(false)}
        onConfirm={handleClearQueue}
      >
        <p>
          Cancel{" "}
          <span className="font-medium text-rm-fog">{queued.length}</span>{" "}
          undelivered command{queued.length === 1 ? "" : "s"} waiting for this
          device.
        </p>
        <p className="text-rm-slate">
          They will never reach the phone. Completed history (acked / failed) is
          kept. This can’t be undone.
        </p>
      </ConfirmModal>
    </>
  );
}

function TabNav({
  tab,
  onChange,
  vertical = false,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  vertical?: boolean;
}) {
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <OverviewGlyph /> },
    { key: "actions", label: "Actions", icon: <BoltGlyph /> },
    { key: "security", label: "Security", icon: <ShieldGlyph /> },
    { key: "kiosk", label: "Kiosk", icon: <KioskGlyph /> },
    { key: "history", label: "History", icon: <ClockGlyph /> },
  ];
  return (
    <div
      role="tablist"
      className={
        vertical
          ? "flex flex-col gap-1 rounded-2xl border border-rm-line bg-rm-panel p-1.5 shadow-card"
          : "flex gap-1 overflow-x-auto rounded-xl border border-rm-line bg-rm-panel p-1 shadow-card"
      }
    >
      {tabs.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`group flex items-center gap-2.5 whitespace-nowrap rounded-xl text-sm font-medium transition-all ${
              vertical ? "px-3 py-2.5 w-full" : "px-4 py-2"
            } ${
              active
                ? "bg-rm-green-soft text-rm-green-deep"
                : "text-rm-slate hover:bg-rm-canvas hover:text-rm-ink"
            }`}
          >
            <span
              className={`shrink-0 transition-colors ${
                active
                  ? "text-rm-green-deep"
                  : "text-rm-slate group-hover:text-rm-ink"
              }`}
            >
              {t.icon}
            </span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const glyph = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
function OverviewGlyph() {
  return (
    <svg {...glyph}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function BoltGlyph() {
  return (
    <svg {...glyph}>
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}
function ShieldGlyph() {
  return (
    <svg {...glyph}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function KioskGlyph() {
  return (
    <svg {...glyph}>
      <rect x="4" y="3" width="16" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
function ClockGlyph() {
  return (
    <svg {...glyph}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <label className="text-sm text-rm-graphite">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/**
 * Age of the FIX itself, which is not the same thing as when we heard about it.
 *
 * `reportedAt` is server receive-time. A sealed kiosk regularly reports `getLastKnownLocation()`,
 * which can be hours old — so a stale position used to render with a fresh timestamp and look
 * live. Chasing a stolen phone to where it used to be is the failure this guards against.
 *
 * `fixedAt` is null for agents that predate the field: say "age unknown" rather than assume it's
 * current, since assuming is exactly the bug.
 */
function FixAge({ ping }: { ping: LocationPing }) {
  if (!ping.fixedAt) {
    return <span className="text-rm-warn">fix age unknown</span>;
  }

  const ageMs = Date.now() - new Date(ping.fixedAt).getTime();
  const mins = Math.floor(ageMs / 60_000);

  if (mins < 2) {
    return <span className="text-rm-green-deep font-medium">fix live</span>;
  }
  if (mins < 15) {
    return <span className="text-rm-slate">fix {mins}m old</span>;
  }
  if (mins < 60) {
    return <span className="text-rm-warn">fix {mins}m old</span>;
  }

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return <span className="text-rm-warn font-medium">fix {hours}h old</span>;
  }
  return (
    <span className="text-rm-danger font-medium">
      fix {Math.floor(hours / 24)}d old
    </span>
  );
}

function CmdStatus({ status }: { status: CommandStatus }) {
  const map: Record<CommandStatus, string> = {
    ACKED: "text-rm-green-deep",
    SENT: "text-rm-slate",
    PENDING: "text-rm-slate",
    FAILED: "text-rm-danger",
  };
  return <span className={`font-medium ${map[status]}`}>{status}</span>;
}

function ActionButton({
  label,
  hint,
  icon,
  onClick,
  busy,
  variant = "neutral",
}: {
  label: string;
  hint: string;
  icon?: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  variant?: "neutral" | "warn" | "danger";
}) {
  const colors = {
    neutral:
      "border-rm-line bg-rm-panel hover:bg-rm-green-soft hover:border-rm-green/30 text-rm-ink",
    warn: "border-rm-warn/25 bg-rm-warn-soft hover:bg-rm-warn/15 text-rm-warn",
    danger:
      "border-rm-danger/25 bg-rm-danger-soft hover:bg-rm-danger/15 text-rm-danger",
  } as const;
  const iconWrap = {
    neutral: "bg-rm-green-soft text-rm-green-deep",
    warn: "bg-white text-rm-warn",
    danger: "bg-white text-rm-danger",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-start gap-3 text-left rounded-xl border p-3 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 ${colors[variant]}`}
    >
      {icon && (
        <span
          className={`shrink-0 grid place-items-center w-9 h-9 rounded-lg ${iconWrap[variant]}`}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-medium">{busy ? "Sending…" : label}</span>
        <span className="block text-xs text-rm-slate mt-0.5">{hint}</span>
      </span>
    </button>
  );
}
