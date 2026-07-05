'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('admin@rmsoft.rw');
  const [password, setPassword] = useState('changeme123');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        await register(email, password, fullName || undefined);
      }
      await login(email, password);
      router.replace('/devices');
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.detail as { error?: string };
        setError(detail?.error ?? `Error ${err.status}`);
      } else {
        setError(String(err));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm animate-fade-up">
        {/* Wordmark */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-baseline text-3xl tracking-tight">
            <span className="font-extrabold text-rm-fog">RM</span>
            <span className="font-light text-rm-fog">soft</span>
            <span className="ml-2 text-xs font-bold tracking-[0.2em] text-rm-green -translate-y-[10px]">
              OS
            </span>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-rm-fog">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-rm-graphite mt-1 mb-6">
            {mode === 'login'
              ? 'Sign in to manage your fleet'
              : 'Register a new operator'}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="text-sm text-rm-graphite">Full name</span>
                <input
                  className="input mt-1.5"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm text-rm-graphite">Email</span>
              <input
                type="email"
                className="input mt-1.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="text-xs text-rm-graphite/60 mt-1 block">
                Must end with @rmsoft.rw
              </span>
            </label>
            <label className="block">
              <span className="text-sm text-rm-graphite">Password</span>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-rm-graphite hover:text-rm-fog transition"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>

            {error && (
              <div className="text-sm text-rm-danger bg-rm-danger-soft border border-rm-danger/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-rm-line text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-sm text-rm-graphite hover:text-rm-fog transition"
            >
              {mode === 'login' ? (
                <>Need an account? <span className="text-rm-green font-medium">Register</span></>
              ) : (
                <>Have an account? <span className="text-rm-green font-medium">Sign in</span></>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-rm-graphite/50 mt-6">
          RMSoft OS · Secure device management
        </p>
      </div>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.2 3" />
      <path d="M6.6 6.6A13.2 13.2 0 0 0 2 12s3.5 7 10 7a9.9 9.9 0 0 0 5.4-1.6" />
      <path d="m9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
