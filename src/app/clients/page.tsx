"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  ApiError,
  getToken,
  listOwners,
  createOwner,
  updateOwner,
  deleteOwner,
  type OwnerInput,
} from "@/lib/api";
import type { Owner, OwnerType } from "@/lib/types";
import { TopBar } from "@/components/TopBar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

export default function ClientsPage() {
  const router = useRouter();
  const toast = useToast();
  const [owners, setOwners] = useState<Owner[] | null>(null);
  const [editing, setEditing] = useState<Owner | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Owner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setOwners(await listOwners());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [load, router]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteOwner(pendingDelete.id);
      toast.success(`Removed ${pendingDelete.name}`);
      setPendingDelete(null);
      load();
    } catch {
      toast.error("Could not remove client");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <TopBar />
      <main className="max-w-6xl mx-auto px-5 py-8 animate-fade-up">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-rm-fog">
              Clients
            </h2>
            <p className="text-sm text-rm-graphite mt-1">
              People and organizations that own phones assign devices to them
            </p>
          </div>
          <button
            onClick={() => setEditing("new")}
            className="px-4 py-2 rounded-lg bg-rm-green text-white text-sm font-medium hover:bg-rm-green-deep transition"
          >
            + Add client
          </button>
        </div>

        {owners === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="card p-5 h-[140px] animate-pulse bg-rm-panel-2"
              />
            ))}
          </div>
        ) : owners.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="mx-auto mb-4 grid place-items-center w-12 h-12 rounded-full bg-rm-green/10 text-rm-green text-2xl">
              🏢
            </div>
            <p className="font-medium text-rm-fog">No clients yet</p>
            <p className="text-sm text-rm-graphite mt-1">
              Add a person or organization, then assign their phones.
            </p>
            <button
              onClick={() => setEditing("new")}
              className="mt-4 px-4 py-2 rounded-lg bg-rm-green text-white text-sm font-medium hover:bg-rm-green-deep transition"
            >
              + Add your first client
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {owners.map((o) => (
              <OwnerCard
                key={o.id}
                owner={o}
                onEdit={() => setEditing(o)}
                onDelete={() => setPendingDelete(o)}
              />
            ))}
          </div>
        )}
      </main>

      {editing && (
        <OwnerFormModal
          owner={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        danger
        title="Remove this client?"
        confirmLabel="Remove"
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      >
        <p>
          Remove{" "}
          <span className="font-medium text-rm-fog">{pendingDelete?.name}</span>
          .
        </p>
        <p className="text-rm-slate">
          Their {pendingDelete?.deviceCount ?? 0} device
          {pendingDelete?.deviceCount === 1 ? "" : "s"} become Unassigned (not
          wiped or deleted). This can’t be undone.
        </p>
      </ConfirmModal>
    </>
  );
}

function OwnerCard({
  owner,
  onEdit,
  onDelete,
}: {
  owner: Owner;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isOrg = owner.type === "ORGANIZATION";
  return (
    <div className="group card p-5 transition duration-200 hover:border-rm-green/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl text-lg ${
              isOrg
                ? "bg-rm-green/10 text-rm-green-deep"
                : "bg-rm-green-soft text-rm-green-deep"
            }`}
          >
            {isOrg ? "🏢" : "👤"}
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-rm-fog truncate">
              {owner.name}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-rm-graphite">
              {isOrg ? "Organization" : "Person"}
            </div>
          </div>
        </div>
        <Link
          href={`/devices?owner=${owner.id}`}
          className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-rm-canvas text-rm-slate border border-rm-line hover:border-rm-green/40 hover:text-rm-green-deep transition"
          title="View this client's phones"
        >
          {owner.deviceCount ?? 0}{" "}
          {owner.deviceCount === 1 ? "phone" : "phones"} →
        </Link>
      </div>

      {(owner.contactName || owner.contactPhone || owner.contactEmail) && (
        <div className="mt-3 space-y-0.5 text-xs text-rm-graphite">
          {owner.contactName && <div>👤 {owner.contactName}</div>}
          {owner.contactPhone && <div>📞 {owner.contactPhone}</div>}
          {owner.contactEmail && (
            <div className="truncate">✉️ {owner.contactEmail}</div>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2 pt-3 border-t border-rm-line">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1.5 rounded-lg border border-rm-line text-rm-ink text-sm hover:bg-rm-canvas transition"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 rounded-lg border border-rm-line text-rm-danger text-sm hover:bg-rm-danger-soft transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function OwnerFormModal({
  owner,
  onClose,
  onSaved,
}: {
  owner: Owner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [type, setType] = useState<OwnerType>(owner?.type ?? "ORGANIZATION");
  const [name, setName] = useState(owner?.name ?? "");
  const [contactName, setContactName] = useState(owner?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(owner?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(owner?.contactEmail ?? "");
  const [notes, setNotes] = useState(owner?.notes ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    const data: OwnerInput = {
      type,
      name: name.trim(),
      contactName: contactName.trim() || null,
      contactPhone: contactPhone.trim() || null,
      contactEmail: contactEmail.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (owner) await updateOwner(owner.id, data);
      else await createOwner(data);
      toast.success(owner ? "Client updated" : "Client added");
      onSaved();
    } catch {
      toast.error("Could not save the client");
    } finally {
      setBusy(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-rm-ink/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-rm-line bg-rm-panel overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-rm-fog">
            {owner ? "Edit client" : "Add client"}
          </h3>

          {/* Person / Organization toggle */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["ORGANIZATION", "PERSON"] as OwnerType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition ${
                  type === t
                    ? "border-rm-green bg-rm-green-soft text-rm-green-deep"
                    : "border-rm-line text-rm-slate hover:bg-rm-canvas"
                }`}
              >
                {t === "ORGANIZATION" ? "🏢 Organization" : "👤 Person"}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <Field
              label={
                type === "ORGANIZATION" ? "Organization name" : "Full name"
              }
              required
            >
              <input
                autoFocus
                className="input"
                placeholder={
                  type === "ORGANIZATION" ? "e.g. Acme Ltd" : "e.g. John Doe"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            {type === "ORGANIZATION" && (
              <Field label="Contact person">
                <input
                  className="input"
                  placeholder="e.g. Jane (IT manager)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <input
                  className="input"
                  placeholder="+250…"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </Field>
              <Field label="Email">
                <input
                  className="input"
                  placeholder="name@…"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                className="input min-h-[64px] resize-y"
                placeholder="Optional"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-rm-line text-rm-ink hover:bg-rm-canvas transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy || !name.trim()}
              className="px-4 py-2 rounded-lg bg-rm-green text-white font-medium hover:bg-rm-green-deep transition disabled:opacity-40"
            >
              {busy ? "Saving…" : owner ? "Save" : "Add client"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : modal;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-rm-graphite">
        {label}
        {required && <span className="text-rm-danger"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
