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
