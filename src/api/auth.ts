import { api } from './client';

export type User = { id: number; username: string };

export const fetchMe = () => api<{ user: User }>('GET', '/auth/me').then((r) => r.user);
export const login = (username: string, password: string) =>
  api<{ user: User }>('POST', '/auth/login', { username, password }).then((r) => r.user);
export const signup = (username: string, password: string, invite: string) =>
  api<{ user: User }>('POST', '/auth/signup', { username, password, invite }).then((r) => r.user);
export const logout = () => api<{ ok: true }>('POST', '/auth/logout');
