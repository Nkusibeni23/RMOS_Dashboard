"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getToken,
  listReleases,
  createRelease,
  deleteRelease,
  rolloutRelease,
  type ReleaseInput,
} from "@/lib/api";
import type { OsRelease } from "@/lib/types";
import { TopBar } from "@/components/TopBar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

export default function ReleasesPage() {
  const router = useRouter();
  const toast = useToast();
  const [releases, setReleases] = useState<OsRelease[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OsRelease | null>(null);
  const [pendingRollout, setPendingRollout] = useState<OsRelease | null>(null);

  const refresh = useCallback(async () => {
    try {
      setReleases(await listReleases());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(String(e));
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    refresh();
  }, [refresh, router]);

  async function handleCreate(input: ReleaseInput) {
    setBusy("create");
    try {
      await createRelease(input);
      toast.success(`Published ${input.version}`);
      await refresh();
    } catch (e) {
      toast.error("Couldn't publish the release");
      setError(String(e));
      throw e;
    } finally {
      setBusy(null);
    }
  }

  async function confirmRollout() {
    const r = pendingRollout;
    if (!r) return;
    setBusy(`rollout-${r.id}`);
    try {
      const { rolledOut } = await rolloutRelease(r.id);
      toast.success(
        rolledOut
          ? `Rolling out ${r.version} to ${rolledOut} device${rolledOut > 1 ? "s" : ""}`
          : `Every device is already on ${r.version}`,
      );
      setPendingRollout(null);
    } catch (e) {
      toast.error("Couldn't roll out");
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    const r = pendingDelete;
    if (!r) return;
    setBusy(`del-${r.id}`);
    try {
      await deleteRelease(r.id);
      toast.success(`Deleted ${r.version}`);
      setPendingDelete(null);
      await refresh();
    } catch (e) {
      toast.error("Couldn't delete");
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <TopBar />
      <main className="max-w-4xl mx-auto px-5 py-8 space-y-5 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-rm-fog">
            RM OS releases
          </h1>
          <p className="text-sm text-rm-slate mt-1">
            Publish a new RMSoft OS build and push it over-the-air — to a single
            device (from its page) or the whole out-of-date fleet here.
          </p>
        </div>

        {error && (
          <div className="text-sm text-rm-danger bg-rm-danger-soft border border-rm-danger/20 rounded-xl p-3">
            {error}
          </div>
        )}

        <NewReleaseForm busy={busy === "create"} onCreate={handleCreate} />

        <section className="rounded-2xl border border-rm-line bg-rm-panel shadow-card overflow-hidden">
          <h2 className="font-semibold text-rm-fog px-5 pt-5 pb-3">
            Published releases
          </h2>
          {releases == null ? (
            <p className="text-sm text-rm-slate px-5 pb-5">Loading…</p>
          ) : releases.length === 0 ? (
            <p className="text-sm text-rm-slate px-5 pb-5">
              No releases yet. Publish your first build above.
            </p>
          ) : (
            <ul className="divide-y divide-rm-line">
              {releases.map((r, i) => (
                <li key={r.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-rm-ink">
                        {r.version}
                      </span>
                      {i === 0 && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rm-green-soft text-rm-green-deep">
                          latest
                        </span>
                      )}
                      {r.mandatory && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rm-warn-soft text-rm-warn">
                          mandatory
                        </span>
                      )}
                    </div>
                    {r.notes && (
                      <p className="text-sm text-rm-slate mt-1 whitespace-pre-line line-clamp-3">
                        {r.notes}
                      </p>
                    )}
                    <p className="text-[11px] text-rm-slate/70 mt-1 font-mono truncate">
                      {r.packageUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setPendingRollout(r)}
                      disabled={busy === `rollout-${r.id}`}
                      className="px-3 py-1.5 rounded-lg bg-rm-green text-white text-xs font-medium hover:bg-rm-green-deep disabled:opacity-50 transition"
                    >
                      {busy === `rollout-${r.id}` ? "…" : "Roll out to fleet"}
                    </button>
                    <button
                      onClick={() => setPendingDelete(r)}
                      disabled={busy === `del-${r.id}`}
                      className="px-2.5 py-1.5 rounded-lg border border-rm-line text-rm-danger text-xs font-medium hover:bg-rm-danger-soft disabled:opacity-50 transition"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <ConfirmModal
        open={pendingRollout !== null}
        title={`Roll out ${pendingRollout?.version} to the fleet?`}
        confirmLabel="Roll out"
        busy={busy === `rollout-${pendingRollout?.id}`}
        onCancel={() => setPendingRollout(null)}
        onConfirm={confirmRollout}
      >
        <p>
          Every device not already on{" "}
          <span className="font-mono text-rm-fog">
            {pendingRollout?.version}
          </span>{" "}
          gets the update.{" "}
          {pendingRollout?.mandatory
            ? "It's mandatory — devices install it automatically."
            : "Devices prompt the user to install or defer."}
        </p>
        <p className="text-rm-slate">
          Offline devices receive it the moment they reconnect.
        </p>
      </ConfirmModal>

      <ConfirmModal
        open={pendingDelete !== null}
        danger
        title="Delete this release?"
        confirmLabel="Delete"
        busy={busy === `del-${pendingDelete?.id}`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>
          Remove{" "}
          <span className="font-mono text-rm-fog">{pendingDelete?.version}</span>{" "}
          from the release list. Devices already updated stay on it. This can’t
          be undone.
        </p>
      </ConfirmModal>
    </>
  );
}

function NewReleaseForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (input: ReleaseInput) => Promise<void>;
}) {
  const [version, setVersion] = useState("");
  const [packageUrl, setPackageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [payloadOffset, setPayloadOffset] = useState("");
  const [payloadSize, setPayloadSize] = useState("");
  const [payloadProperties, setPayloadProperties] = useState("");

  const canSubmit =
    version.trim().length > 0 && /^https?:\/\/.+/.test(packageUrl.trim());

  async function submit() {
    try {
      await onCreate({
        version: version.trim(),
        packageUrl: packageUrl.trim(),
        notes: notes.trim() || undefined,
        mandatory,
        payloadOffset: payloadOffset.trim() || undefined,
        payloadSize: payloadSize.trim() || undefined,
        payloadProperties: payloadProperties.trim()
          ? payloadProperties
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
          : undefined,
      });
      setVersion("");
      setPackageUrl("");
      setNotes("");
      setMandatory(false);
      setPayloadOffset("");
      setPayloadSize("");
      setPayloadProperties("");
    } catch {
      /* toast handled upstream */
    }
  }

  return (
    <section className="rounded-2xl border border-rm-line bg-rm-panel p-5 shadow-card space-y-3">
      <h2 className="font-semibold text-rm-fog">Publish a new build</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Version / build id *">
          <input
            className="input"
            placeholder="e.g. BP1A.250505.006"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </Field>
        <Field label="OTA package URL *">
          <input
            className="input"
            placeholder="https://…/rmsoft-ota.zip"
            value={packageUrl}
            onChange={(e) => setPackageUrl(e.target.value)}
          />
        </Field>
      </div>
      <Field label="What's new (shown to the user)">
        <textarea
          className="input min-h-[72px]"
          placeholder="• Fixed…&#10;• Improved…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <details className="text-sm">
        <summary className="cursor-pointer text-rm-slate select-none">
          Streaming A/B metadata (optional — from payload_properties.txt)
        </summary>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <Field label="payload offset">
            <input
              className="input"
              value={payloadOffset}
              onChange={(e) => setPayloadOffset(e.target.value)}
            />
          </Field>
          <Field label="payload size">
            <input
              className="input"
              value={payloadSize}
              onChange={(e) => setPayloadSize(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="payload_properties.txt (one per line)">
              <textarea
                className="input min-h-[72px] font-mono text-xs"
                placeholder={"FILE_HASH=…\nFILE_SIZE=…\nMETADATA_HASH=…"}
                value={payloadProperties}
                onChange={(e) => setPayloadProperties(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </details>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-sm text-rm-ink cursor-pointer">
          <input
            type="checkbox"
            checked={mandatory}
            onChange={(e) => setMandatory(e.target.checked)}
          />
          Mandatory (auto-install, no user prompt)
        </label>
        <button
          onClick={submit}
          disabled={!canSubmit || busy}
          className="px-4 py-2 rounded-lg bg-rm-green text-white font-medium text-sm hover:bg-rm-green-deep disabled:opacity-40 transition"
        >
          {busy ? "Publishing…" : "Publish release"}
        </button>
      </div>
    </section>
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
    <div>
      <label className="text-sm text-rm-slate">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
