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
    SET_WHITELIST: 'Whitelist',
    SET_APP_HIDDEN: 'App visibility',
    ENABLE_SYSTEM_APP: 'Enable app',
    INSTALL_APK: 'Install app',
    UPDATE_APP: 'Update app',
  };
  return map[type] ?? type;
}
