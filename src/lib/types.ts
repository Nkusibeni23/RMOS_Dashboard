/**
 * How long after its last heartbeat a device still counts as online.
 *
 * The agent beats every 60s, so the old 120s window tolerated exactly ONE missed beat — a Doze
 * nap or a single dropped packet flipped a perfectly connected phone to "offline". Three beats
 * of slack stops that flapping. The cost is that a genuinely dead phone takes ~3 min to show as
 * offline, which is the better trade: commands queue and redeliver on reconnect either way, so
 * this badge is operator information, not a delivery guarantee.
 */
export const ONLINE_WINDOW_MS = 180_000;

export type Role = 'USER' | 'ADMIN' | 'SUPER';

export type DeviceStatus = 'ACTIVE' | 'LOST' | 'WIPED' | 'UNENROLLED';

export type CommandType =
  // Anti-theft
  | 'LOCK'
  | 'WIPE'
  | 'LOCATE_NOW'
  | 'RING'
  | 'MESSAGE'
  | 'UNLOCK'
  | 'SET_OWNER'
  | 'SET_RADIO_LOCKDOWN'
  | 'SET_ESIM_ONLY'
  // Kiosk & fleet control
  | 'REBOOT'
  | 'REAPPLY_POLICIES'
  | 'ENTER_KIOSK'
  | 'EXIT_KIOSK'
  | 'SET_CAMERA_DISABLED'
  | 'SET_STATUS_BAR_DISABLED'
  | 'SET_KEYGUARD_DISABLED'
  | 'SET_RADIO_LOCKDOWN'
  | 'SET_WHITELIST'
  | 'SET_APP_HIDDEN'
  | 'ENABLE_SYSTEM_APP'
  | 'INSTALL_APK'
  | 'UPDATE_APP'
  | 'UPDATE_OS';

/** A published RMSoft OS build the fleet can update to (OTA). */
export interface OsRelease {
  id: string;
  version: string;
  notes: string | null;
  packageUrl: string;
  payloadOffset: string | null;
  payloadSize: string | null;
  payloadProperties: string[];
  mandatory: boolean;
  createdAt: string;
  publishedById: string;
}

export type CommandStatus = 'PENDING' | 'SENT' | 'ACKED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  role: Role;
  fullName: string | null;
}

export type OwnerType = 'PERSON' | 'ORGANIZATION';

/** A client that owns phones — a Person or an Organization. Not a login account. */
export interface Owner {
  id: string;
  type: OwnerType;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deviceCount?: number;
}

export interface LocationPing {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  altitudeM: number | null;
  speedMps: number | null;
  reportedAt: string;
  /**
   * When the device's provider actually produced the fix — as opposed to `reportedAt`, which is
   * when the server received it. A sealed kiosk frequently reports a last-known fix that is hours
   * old, so these can differ wildly. Null for pings from agents that predate the field.
   */
  fixedAt: string | null;
  source: string | null;
}

export interface Command {
  id: string;
  deviceId: string;
  issuedById: string;
  type: CommandType;
  payload: Record<string, unknown> | null;
  status: CommandStatus;
  createdAt: string;
  sentAt: string | null;
  ackedAt: string | null;
  errorMessage: string | null;
}

export interface Device {
  id: string;
  serialNumber: string;
  hardwareSerial: string | null;
  ownerLabel: string | null;
  imei: string | null;
  model: string | null;
  androidVersion: string | null;
  romBuild: string | null;
  ownerId: string;
  status: DeviceStatus;
  enrolledAt: string;
  lastSeenAt: string | null;
  // Live telemetry (reported over MQTT heartbeat)
  batteryLevel: number | null;
  kioskActive: boolean | null;
  cameraDisabled: boolean | null;
  statusBarDisabled: boolean | null;
  keyguardDisabled: boolean | null;
  radioLockdown: boolean | null;
  telemetryAt: string | null;
  // Anti-theft alerts
  lastAlertType: string | null;
  lastAlertAt: string | null;
  lastAlertInfo: string | null;
  owner?: { email: string; fullName: string | null };
  assignedOwnerId: string | null;
  assignedOwner?: Owner | null;
  locations?: LocationPing[];
  commands?: Command[];
}
