'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  danger = false,
  requireText,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  requireText?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!open) setText('');
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const locked = requireText ? text.trim() !== requireText : false;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-rm-ink/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-rm-line bg-rm-panel shadow-card-hover overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-rm-fog">{title}</h3>
          <div className="mt-2 text-sm text-rm-graphite space-y-2">{children}</div>

          {requireText && (
            <div className="mt-4">
              <label className="text-xs text-rm-graphite">
                Type{' '}
                <span className="font-mono text-rm-fog">{requireText}</span>{' '}
                to confirm
              </label>
              <input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="input mt-1"
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-rm-line text-rm-ink hover:bg-rm-canvas transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={busy || locked}
              className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-40 ${
                danger
                  ? 'bg-rm-danger text-white hover:brightness-110'
                  : 'bg-rm-green text-white hover:bg-rm-green-deep'
              }`}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modal, document.body)
    : modal;
}
