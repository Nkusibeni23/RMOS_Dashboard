'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  msg: string;
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((x) => x.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, msg: string) => {
      const id = ++counter;
      setItems((x) => [...x, { id, kind, msg }]);
      setTimeout(() => remove(id), 3600);
    },
    [remove],
  );

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {items.map((t) => (
          <Toast key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const accent =
    item.kind === 'success'
      ? 'bg-rm-green'
      : item.kind === 'error'
        ? 'bg-rm-danger'
        : 'bg-rm-slate';
  return (
    <div
      role="status"
      onClick={onClose}
      className="pointer-events-auto flex items-center gap-2.5 bg-rm-ink text-white pl-3 pr-4 py-2.5 rounded-xl shadow-card-hover text-sm cursor-pointer animate-fade-up max-w-xs"
    >
      <span className={`grid place-items-center w-5 h-5 rounded-full shrink-0 ${accent}`}>
        {item.kind === 'success' ? (
          <Check />
        ) : item.kind === 'error' ? (
          <Cross />
        ) : (
          <Dot />
        )}
      </span>
      <span className="leading-snug">{item.msg}</span>
    </div>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function Cross() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function Dot() {
  return <span className="w-1.5 h-1.5 rounded-full bg-white" />;
}
