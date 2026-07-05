import type { DeviceStatus } from '@/lib/types';

const styles: Record<DeviceStatus, string> = {
  ACTIVE: 'bg-rm-green-soft text-rm-green-deep border-rm-green/25',
  LOST: 'bg-rm-danger-soft text-rm-danger border-rm-danger/25',
  WIPED: 'bg-rm-canvas text-rm-slate border-rm-line',
  UNENROLLED: 'bg-rm-canvas text-rm-slate border-rm-line',
};

const dot: Record<DeviceStatus, string> = {
  ACTIVE: 'bg-rm-green',
  LOST: 'bg-rm-danger',
  WIPED: 'bg-rm-slate',
  UNENROLLED: 'bg-rm-slate',
};

export function StatusPill({ status }: { status: DeviceStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
      {status}
    </span>
  );
}
