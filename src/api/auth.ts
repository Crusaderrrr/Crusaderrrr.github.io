import { api } from './client';

export type User = { id: number; username: string; isAdmin: boolean };

export const fetchMe = () => api<{ user: User }>('GET', '/auth/me').then((r) => r.user);
export const login = (username: string, password: string) =>
  api<{ user: User }>('POST', '/auth/login', { username, password }).then((r) => r.user);
export const signup = (username: string, password: string, invite: string) =>
  api<{ user: User }>('POST', '/auth/signup', { username, password, invite }).then((r) => r.user);
export const logout = () => api<{ ok: true }>('POST', '/auth/logout');

/** Owner only. */
export const createInvite = () => api<{ code: string }>('POST', '/invites').then((r) => r.code);

/** A link that opens the sign-up screen with the code filled in (HashRouter: the route lives in the hash). */
export const inviteLink = (code: string) =>
  `${location.origin}/#/signup?invite=${code.match(/.{1,4}/g)?.join('-') ?? code}`;
