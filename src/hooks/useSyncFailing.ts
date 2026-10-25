import { useSyncExternalStore } from 'react';
import { isSyncFailing, SYNC_STATE } from '../repositories/workoutStore';

/** True while a workout save is failing and being retried (the phone is offline or the server is down). */
export const useSyncFailing = () =>
  useSyncExternalStore(
    (cb) => {
      window.addEventListener(SYNC_STATE, cb);
      return () => window.removeEventListener(SYNC_STATE, cb);
    },
    isSyncFailing,
  );
