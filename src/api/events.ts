/** Fired on window after every write, so mounted screens can re-query (see useDbQuery). */
export const DB_CHANGE = 'db-change';

export const notifyChange = () => window.dispatchEvent(new Event(DB_CHANGE));
