import type { Device } from '@/lib/types';

/**
 * Compact live-health strip shown under the device header: battery + key policy states, reported
 * over the MQTT heartbeat. Renders nothing until the phone has sent telemetry at least once.
 */
export function DeviceTelemetry({ device }: { device: Device }) {
  if (device.telemetryAt == null) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {device.batteryLevel != null && <Battery level={device.batteryLevel} />}
      {device.kioskActive != null && (
        <StatePill label={device.kioskActive ? 'Kiosk on' : 'Kiosk off'} good={device.kioskActive} />
      )}
      {device.cameraDisabled != null && (
        <StatePill
          label={device.cameraDisabled ? 'Camera off' : 'Camera on'}
          good={device.cameraDisabled}
        />
      )}
      {device.keyguardDisabled != null && (
        <StatePill
          label={device.keyguardDisabled ? 'Lock screen off' : 'Lock screen on'}
          good={!device.keyguardDisabled}
        />
      )}
    </div>
  );
}

function Battery({ level }: { level: number }) {
  const tone =
    level <= 15
      ? 'text-rm-danger border-rm-danger/25 bg-rm-danger-soft'
      : level <= 35
        ? 'text-rm-warn border-rm-warn/25 bg-rm-warn-soft'
        : 'text-rm-green-deep border-rm-green/25 bg-rm-green-soft';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${tone}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="18" height="10" rx="2" />
        <path d="M22 11v2" />
        <rect x="4" y="9" width={Math.max(1, (level / 100) * 14)} height="6" rx="1" fill="currentColor" stroke="none" />
      </svg>
      {level}%
    </span>
  );
}

function StatePill({ label, good }: { label: string; good: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border border-rm-line bg-rm-canvas text-rm-slate">
      <span className={`w-1.5 h-1.5 rounded-full ${good ? 'bg-rm-green' : 'bg-rm-slate/50'}`} />
      {label}
    </span>
  );
}
