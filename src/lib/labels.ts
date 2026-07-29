import type { CommandType } from './types';

/** Human-friendly label for a command type — used in toasts and status messages. */
export function friendlyCommand(type: CommandType | string): string {
  const map: Record<string, string> = {
    LOCATE_NOW: 'Locate',
    RING: 'Ring',
    LOCK: 'Lock',
    UNLOCK: 'Unlock',
    MESSAGE: 'Message',
    WIPE: 'Wipe',
    SET_OWNER: 'Set owner',
    REBOOT: 'Reboot',
    REAPPLY_POLICIES: 'Re-apply policies',
    ENTER_KIOSK: 'Enter kiosk',
    EXIT_KIOSK: 'Exit kiosk',
    SET_CAMERA_DISABLED: 'Camera',
    SET_STATUS_BAR_DISABLED: 'Status bar',
    SET_KEYGUARD_DISABLED: 'Keyguard',
    SET_RADIO_LOCKDOWN: 'Radio lockdown',
    SET_WHITELIST: 'Whitelist',
    SET_APP_HIDDEN: 'App visibility',
    ENABLE_SYSTEM_APP: 'Enable app',
    INSTALL_APK: 'Install app',
    UPDATE_APP: 'Update app',
    UPDATE_OS: 'RM OS update',
  };
  return map[type] ?? type;
}

/** "just now" / "4m ago" / "3h ago" / "2d ago" — short relative time for timeline rows. */
export function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 45) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
