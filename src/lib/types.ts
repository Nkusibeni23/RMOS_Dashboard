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
  // Kiosk & fleet control
  | 'REBOOT'
  | 'REAPPLY_POLICIES'
  | 'ENTER_KIOSK'
  | 'EXIT_KIOSK'
  | 'SET_CAMERA_DISABLED'
  | 'SET_STATUS_BAR_DISABLED'
  | 'SET_KEYGUARD_DISABLED'
  | 'SET_WHITELIST'
  | 'SET_APP_HIDDEN'
  | 'ENABLE_SYSTEM_APP'
  | 'INSTALL_APK'
  | 'UPDATE_APP';

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
