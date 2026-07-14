"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, deleteDevice, getToken, listDevices, listOwners } from "@/lib/api";
import type { Device, Owner } from "@/lib/types";
import { TopBar } from "@/components/TopBar";
import { StatusPill } from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Select } from "@/components/Select";
import { usePolling } from "@/lib/usePolling";

function isOnline(d: Device) {
  return (
    !!d.lastSeenAt && Date.now() - new Date(d.lastSeenAt).getTime() < 120_000
  );
}

export default function DevicesPage() {
  const router = useRouter();
  const toast = useToast();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Device | null>(null);
  const [removing, setRemoving] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [filterOwner, setFilterOwner] = useState<string>("all");

  const load = useCallback(
    () =>
      listDevices()
        .then(setDevices)
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 401) {
            router.replace("/login");
            return;
          }
          setError(String(e));
        }),
    [router],
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    listOwners().then(setOwners).catch(() => {});
    // Deep-link: /devices?owner=<id> (or "unassigned") pre-selects the filter, so a client card
    // on the Clients page can jump straight to that client's phones.
    const owner = new URLSearchParams(window.location.search).get("owner");
    if (owner) setFilterOwner(owner);
  }, [router, load]);
  usePolling(load, 5000);

  const unassignedCount = devices?.filter((d) => !d.assignedOwnerId).length ?? 0;
  const shown = (devices ?? []).filter((d) =>
    filterOwner === "all"
      ? true
      : filterOwner === "unassigned"
        ? !d.assignedOwnerId
        : d.assignedOwnerId === filterOwner,
  );

  // Opens the confirmation modal (replaces the ugly browser confirm()).
  function askRemove(e: React.MouseEvent, d: Device) {
    e.preventDefault();
    e.stopPropagation();
    setPendingRemove(d);
  }

  async function confirmRemove() {
    const d = pendingRemove;
    if (!d) return;
    setRemoving(true);
    try {
      await deleteDevice(d.id);
      toast.success(`Removed ${d.model ?? "device"}`);
      setPendingRemove(null);
      await load();
    } catch (err) {
      toast.error("Could not remove device");
      setError(String(err));
    } finally {
      setRemoving(false);
    }
  }

  const onlineCount = devices?.filter(isOnline).length ?? 0;

  return (
    <>
      <TopBar />
      <main className="max-w-6xl mx-auto px-5 py-8 animate-fade-up">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-rm-fog">
              Devices
            </h2>
            <p className="text-sm text-rm-graphite mt-1">
              Manage and track your enrolled fleet
            </p>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <Stat label="Enrolled" value={devices ? devices.length : "—"} />
          <Stat label="Online" value={devices ? onlineCount : "—"} accent />
          <Stat
            label="Offline"
            value={devices ? devices.length - onlineCount : "—"}
          />
        </div>

        {error && (
          <div className="text-sm text-rm-danger bg-rm-danger-soft border border-rm-danger/20 rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        {devices && devices.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <Select
              value={filterOwner}
              onChange={setFilterOwner}
              aria-label="Filter by client"
              className="min-w-[220px]"
              options={[
                { value: "all", label: `All devices (${devices.length})` },
                { value: "unassigned", label: `⚠ Unassigned (${unassignedCount})` },
                ...owners.map((o) => ({
                  value: o.id,
                  label: `${o.type === "ORGANIZATION" ? "🏢" : "👤"} ${o.name}`,
                })),
              ]}
            />
            {filterOwner !== "all" && (
              <button
                onClick={() => setFilterOwner("all")}
                className="text-xs text-rm-graphite hover:text-rm-fog transition"
              >
                clear
              </button>
            )}
          </div>
        )}

        {!devices ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="card p-5 h-[132px] animate-pulse bg-rm-panel-2"
              />
            ))}
          </div>
        ) : devices.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="mx-auto mb-4 grid place-items-center w-12 h-12 rounded-full bg-rm-green/10 text-rm-green text-xl">
              ⌾
            </div>
            <p className="text-rm-fog font-medium mb-1">
              No devices enrolled yet
            </p>
            <p className="text-sm text-rm-graphite">
              Phones appear here automatically after they enroll.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="card p-10 text-center text-sm text-rm-graphite">
            No devices match this filter.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((d) => (
              <Link
                key={d.id}
                href={`/devices/${d.id}`}
                className="group relative card p-5 transition duration-200 hover:border-rm-green/40 hover:-translate-y-0.5"
              >
                <button
                  onClick={(e) => askRemove(e, d)}
                  title="Remove device"
                  className="absolute top-2.5 right-2.5 w-7 h-7 grid place-items-center rounded-lg text-rm-slate hover:text-rm-danger hover:bg-rm-danger-soft transition opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
                <div className="flex items-start justify-between gap-3 pr-7">
                  <div className="min-w-0">
                    <div className="font-semibold text-rm-fog truncate">
                      {d.model ?? "Device"}
                    </div>
                    <div className="text-xs text-rm-graphite font-mono truncate mt-0.5">
                      {d.serialNumber}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusPill status={d.status} />
                    {d.lastAlertType && (
                      <span className="text-[10px] font-semibold text-rm-danger">
                        ⚠{" "}
                        {d.lastAlertType === "SIM_SWAP" ? "SIM swap" : "Alert"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-rm-graphite">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline(d) ? "bg-rm-green" : "bg-rm-graphite/50"
                      }`}
                    />
                    {isOnline(d)
                      ? "Online"
                      : d.lastSeenAt
                        ? new Date(d.lastSeenAt).toLocaleString()
                        : "never seen"}
                    {d.batteryLevel != null && (
                      <span className="text-rm-graphite/70">
                        · {d.batteryLevel}%
                      </span>
                    )}
                  </span>
                  <span className="text-rm-graphite group-hover:text-rm-green transition">
                    Manage →
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-rm-line text-xs truncate">
                  {d.assignedOwner ? (
                    <span className="text-rm-graphite">
                      {d.assignedOwner.type === "ORGANIZATION" ? "🏢" : "👤"}{" "}
                      {d.assignedOwner.name}
                    </span>
                  ) : (
                    <span className="text-rm-warn">⚠ Unassigned</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        open={pendingRemove !== null}
        danger
        title="Remove this device?"
        confirmLabel="Remove"
        busy={removing}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      >
        <p>
          Remove{" "}
          <span className="font-medium text-rm-fog">
            {pendingRemove?.model ?? "this device"}
          </span>{" "}
          <span className="font-mono text-xs text-rm-graphite">
            ({pendingRemove?.serialNumber})
          </span>{" "}
          from the dashboard.
        </p>
        <p className="text-rm-slate">
          This only removes the dashboard record. It does not wipe or unlock the
          phone. If the device is still active, it will re-enroll and reappear
          on its next check-in.
        </p>
      </ConfirmModal>
    </>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-rm-graphite">
        {label}
      </div>
      <div
        className={`mt-1.5 text-3xl font-bold tabular-nums ${
          accent ? "text-rm-green" : "text-rm-fog"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
