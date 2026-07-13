'use client';

import type { Command, CommandType, Device, User } from './types';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';

const TOKEN_KEY = 'rmsoft.accessToken';
const USER_KEY = 'rmsoft.user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(`API ${status}: ${JSON.stringify(detail)}`);
  }
}

export async function login(email: string, password: string) {
  const r = await call<{ accessToken: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem(TOKEN_KEY, r.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(r.user));
  return r;
}

export async function register(email: string, password: string, fullName?: string) {
  return call<{ id: string; email: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, fullName }),
  });
}

export function listDevices() {
  return call<Device[]>('/api/devices');
}

export function getDevice(id: string) {
  return call<Device>(`/api/devices/${id}`);
}

export function sendCommand(
  id: string,
  type: CommandType,
  payload?: Record<string, unknown>,
) {
  return call<Command>(`/api/devices/${id}/commands`, {
    method: 'POST',
    body: JSON.stringify({ type, payload }),
  });
}

export function markFound(id: string) {
  return call<Device>(`/api/devices/${id}/mark-found`, { method: 'POST' });
}

export function deleteDevice(id: string) {
  return call<void>(`/api/devices/${id}`, { method: 'DELETE' });
}

export type UploadedApk = { filename: string; size: number; url: string; uploadedAt?: string };

/**
 * Upload an APK file to the server → returns a public download URL to push via INSTALL_APK.
 * Uses XMLHttpRequest (not fetch) so we can report live upload progress — APKs are large (Cromite
 * is ~100 MB) and a static "Uploading…" with no feedback is a poor experience. [onProgress] is
 * called with 0–100 as the bytes go up.
 */
export function uploadApk(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadedApk> {
  const token = getToken();
  const form = new FormData();
  form.append('apk', file);
  return new Promise<UploadedApk>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/api/apks/upload`);
    if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
    // NOTE: do NOT set content-type — the browser adds the multipart boundary itself.
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadedApk);
        } catch {
          reject(new ApiError(xhr.status, xhr.responseText));
        }
      } else {
        let detail: unknown = xhr.responseText;
        try {
          detail = JSON.parse(xhr.responseText);
        } catch {
          /* keep raw text */
        }
        reject(new ApiError(xhr.status, detail));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'network error during upload'));
    xhr.ontimeout = () => reject(new ApiError(0, 'upload timed out'));
    xhr.send(form);
  });
}

export function listApks() {
  return call<UploadedApk[]>('/api/apks');
}

export function deleteApk(filename: string) {
  return call<{ ok: boolean }>(`/api/apks/${encodeURIComponent(filename)}`, { method: 'DELETE' });
}
