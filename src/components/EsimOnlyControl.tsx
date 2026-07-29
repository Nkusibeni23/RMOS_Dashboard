"use client";

import { useState } from "react";
import { sendCommand } from "@/lib/api";
import type { Device } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";

/**
 * eSIM-only control (send-only). Enforcing eSIM-only disables any physical SIM so a thief can't swap
 * one in; allowing a physical SIM lifts that so the device can use a removable SIM. The phone does
 * not report this state back yet, so this fires the command without reflecting live state, two
 * explicit actions instead of a stateful switch so nothing looks confirmed that isn't.
 */
export function EsimOnlyControl({
  device,
  onDone,
  onError,
}: {
  device: Device;
  onDone?: () => void;
  onError?: (msg: string) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<null | "on" | "off">(null);
  // Which action is awaiting confirmation (null = no modal open).
  const [confirming, setConfirming] = useState<null | "on" | "off">(null);

  async function set(enabled: boolean) {
    setBusy(enabled ? "on" : "off");
    try {
      await sendCommand(device.id, "SET_ESIM_ONLY", { enabled });
      toast.success(
        enabled
          ? "Sent, enforcing eSIM only (physical SIM disabled)"
          : "Sent, allowing a physical SIM",
      );
      onDone?.();
    } catch (e) {
      toast.error("Couldn't send the eSIM-only command");
      onError?.(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function confirm() {
    if (confirming === null) return;
    const enabled = confirming === "on";
    await set(enabled);
    setConfirming(null);
  }

  return (
    <section className="rounded-2xl border border-rm-line bg-rm-panel p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-rm-canvas text-rm-slate">
          <SimIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-rm-ink">Physical SIM policy</h3>
          <p className="text-sm text-rm-slate mt-0.5">
            eSIM-only disables any physical SIM. Turn it off to let this device
            use a removable SIM.
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setConfirming("on")}
              className="inline-flex items-center gap-2 rounded-xl border border-rm-line bg-rm-canvas px-3 py-2 text-sm font-medium text-rm-ink transition-colors hover:bg-rm-green-soft hover:text-rm-green-deep disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy === "on" ? "Sending…" : "Enforce eSIM only"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setConfirming("off")}
              className="inline-flex items-center gap-2 rounded-xl border border-rm-line bg-rm-canvas px-3 py-2 text-sm font-medium text-rm-ink transition-colors hover:bg-rm-green-soft hover:text-rm-green-deep disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy === "off" ? "Sending…" : "Allow physical SIM"}
            </button>
          </div>

          <p className="text-xs text-rm-slate mt-3 leading-relaxed">
            Send-only, the phone applies it on receipt. Live state is not shown
            here yet.
          </p>
        </div>
      </div>

      <ConfirmModal
        open={confirming !== null}
        danger={confirming === "on"}
        title={
          confirming === "on" ? "Enforce eSIM only?" : "Allow a physical SIM?"
        }
        confirmLabel={
          confirming === "on" ? "Enforce eSIM only" : "Allow physical SIM"
        }
        busy={busy !== null}
        onConfirm={confirm}
        onCancel={() => setConfirming(null)}
      >
        {confirming === "on" ? (
          <>
            <p>
              This tells{" "}
              <span className="font-medium text-rm-fog">
                {device.model ?? "this device"}
              </span>{" "}
              to{" "}
              <span className="font-medium text-rm-fog">
                disable any physical SIM
              </span>{" "}
              and accept only its eSIM.
            </p>
            <p className="text-rm-slate">
              Use this as an anti-theft measure so a thief can’t swap in another
              SIM. The phone applies it on its next check-in.
            </p>
          </>
        ) : (
          <>
            <p>
              This lets{" "}
              <span className="font-medium text-rm-fog">
                {device.model ?? "this device"}
              </span>{" "}
              use a{" "}
              <span className="font-medium text-rm-fog">
                removable physical SIM
              </span>{" "}
              again, lifting the eSIM-only restriction.
            </p>
            <p className="text-rm-slate">
              The phone applies it on its next check-in.
            </p>
          </>
        )}
      </ConfirmModal>
    </section>
  );
}

function SimIcon() {
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
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <rect x="8" y="12" width="8" height="6" rx="1" />
      <path d="M11 12v6M8 15h8" />
    </svg>
  );
}
