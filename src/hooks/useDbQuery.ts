import { useEffect, useState } from 'react';
import { DB_CHANGE } from '../db/client';

/** Runs a repository read and re-runs it after every DB write. undefined while loading. */
export function useDbQuery<T>(fn: () => Promise<T>, deps: unknown[]): T | undefined {
  const [data, setData] = useState<T>();
  useEffect(() => {
    let alive = true;
    const load = () => {
      fn().then((d) => alive && setData(d), console.error);
    };
    load();
    window.addEventListener(DB_CHANGE, load);
    return () => {
      alive = false;
      window.removeEventListener(DB_CHANGE, load);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps
  }, deps);
  return data;
}

/** Re-renders every `ms` and returns the current time; for live clocks. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
