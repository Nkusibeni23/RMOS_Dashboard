"use client";

import { useEffect, useRef, useState } from "react";
import { sendCommand } from "@/lib/api";
import type { Device } from "@/lib/types";
import { useToast } from "@/components/Toast";

/**
 * Radio-lockdown control — a state-aware security switch. It reflects the phone's live reported
 * state (over the heartbeat), optimistically shows the target while the phone confirms ("Applying…"),
 * and surfaces when the lockdown was auto-engaged because the device is Lost. On = the phone can't
 * be taken offline (airplane mode + mobile-data-off + cell-network changes are blocked).
 */
export function RadioLockdownControl({
  device,
  onDone,
  onError,
}: {
  device: Device;
  onDone?: () => void;
  onError?: (msg: string) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // The value we're steering toward until the phone's telemetry confirms it (optimistic UI).
  const [pending, setPending] = useState<boolean | null>(null);
  const lastReported = useRef<boolean | null>(device.radioLockdown);

  const reported = device.radioLockdown === true;
  // Show the target while a change is in flight; otherwise the phone's real reported state.
  const shown = pending ?? reported;
  const applying = pending !== null && pending !== reported;
  const autoLost = device.status === "LOST" && shown;

  // Clear the optimistic state once the phone reports the value we asked for.
  useEffect(() => {
    if (device.radioLockdown !== lastReported.current) {
      lastReported.current = device.radioLockdown;
    }
    if (pending !== null && device.radioLockdown === pending) {
      setPending(null);
    }
  }, [device.radioLockdown, pending]);

  async function set(enabled: boolean) {
    setBusy(true);
    setPending(enabled);
    try {
      await sendCommand(device.id, "SET_RADIO_LOCKDOWN", { enabled });
      toast.success(
        enabled
          ? "Radios locked this phone can't be taken offline"
          : "Radio lockdown lifted",
      );
      onDone?.();
    } catch (e) {
      setPending(null);
      toast.error("Couldn't change radio lockdown");
      onError?.(String(e));
    } finally {
      setBusy(false);
    }
  }

  const statusText = applying
    ? shown
      ? "Locking radios… waiting for the phone"
      : "Unlocking… waiting for the phone"
    : device.radioLockdown == null
      ? "Not reported yet waiting for the phone to check in"
      : shown
        ? "Locked this phone can't be taken offline"
        : "Unlocked the phone can go offline normally";

  return (
    <section className="rounded-2xl border border-rm-line bg-rm-panel p-5 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl transition-colors ${
              shown
                ? "bg-rm-green-soft text-rm-green-deep"
                : "bg-rm-canvas text-rm-slate"
            }`}
          >
            <SignalLockIcon locked={shown} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-rm-ink">Radio lockdown</h3>
              {autoLost && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rm-warn-soft text-rm-warn border border-rm-warn/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-rm-warn" />
                  Auto · device is Lost
                </span>
              )}
              {applying && (
                <span className="text-[11px] font-medium text-rm-slate animate-pulse">
                  Applying…
                </span>
              )}
            </div>
            <p
              className={`text-sm mt-0.5 ${
                shown ? "text-rm-green-deep" : "text-rm-slate"
              }`}
            >
              {statusText}
            </p>
          </div>
        </div>

        <Switch
          checked={shown}
          busy={applying}
          disabled={busy}
          onChange={() => set(!shown)}
          label="Radio lockdown"
        />
      </div>

      <p className="text-xs text-rm-slate mt-3 leading-relaxed">
        When <span className="font-medium text-rm-ink">on</span>, the phone
        can’t be taken offline it blocks airplane mode, turning mobile data off,
        and cell-network changes. Keeps the always-on agent reachable on a
        device. Turns on automatically when a device is marked{" "}
        <span className="font-medium text-rm-warn">Lost</span>.
      </p>
    </section>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  busy,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  busy?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rm-green/50 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-rm-green" : "bg-rm-line"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        } ${busy ? "animate-pulse" : ""}`}
      />
    </button>
  );
}

function SignalLockIcon({ locked }: { locked: boolean }) {
  return (
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
      {/* signal bars */}
      <path d="M3 20h.01M8 20v-4M13 20v-9" opacity={locked ? 1 : 0.5} />
      {locked ? (
        // small padlock at the top-right when locked
        <>
          <rect x="15" y="9" width="7" height="6" rx="1.2" />
          <path d="M16.5 9V7.5a2 2 0 0 1 4 0V9" />
        </>
      ) : (
        <path d="M18 11V4" opacity={0.5} />
      )}
    </svg>
  );
}
