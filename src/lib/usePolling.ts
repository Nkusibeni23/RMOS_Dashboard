'use client';

import { useEffect, useRef } from 'react';

/**
 * Poll `fn` every `ms` — but pause while the browser tab is hidden (no pointless requests when the
 * user isn't looking) and refetch immediately the moment the tab becomes visible again. This keeps
 * the dashboard feeling live without hammering the API in background tabs.
 */
export function usePolling(fn: () => void, ms: number) {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => saved.current();
    const start = () => {
      if (!timer) timer = setInterval(tick, ms);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        tick(); // catch up immediately on re-focus
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ms]);
}
