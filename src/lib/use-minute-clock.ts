// src/lib/use-minute-clock.ts
// The current time for client components, refreshed once a minute (stream
// uptime, "next stream" selection). Date.now() can't be read during render:
// the react-hooks purity rule forbids it, and under cacheComponents Next
// errors on it while prerendering a client component. useSyncExternalStore
// reads null on the server and during hydration, then the client value.
import { useSyncExternalStore } from "react";

const TICK_MS = 60_000;

let now: number | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    // React re-reads the snapshot after subscribing, so this first value
    // renders right away without waiting for the first tick
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => null;

/** Epoch ms, updated every minute; null on the server and before subscribing. */
export function useMinuteClock(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
