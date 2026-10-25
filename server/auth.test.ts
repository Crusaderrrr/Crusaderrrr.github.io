import { describe, expect, it } from 'vitest';
import { createLimiter, formatInvite, hashPassword, newInviteCode, normalizeInvite, verifyPassword } from './auth.js';

describe('invite codes', () => {
  it('generates 12 unambiguous characters', () => {
    for (let i = 0; i < 50; i++) expect(newInviteCode()).toMatch(/^[A-HJKMNP-Z2-9]{12}$/);
  });
  it('normalises what a person types', () => {
    expect(normalizeInvite(' abcd-efgh 2345 ')).toBe('ABCDEFGH2345');
    expect(formatInvite('ABCDEFGH2345')).toBe('ABCD-EFGH-2345');
  });
});

describe('passwords', () => {
  it('verifies the right password only, and never for an unknown user', async () => {
    const h = await hashPassword('correct horse battery');
    expect(h).toContain('$argon2id$');
    expect(await verifyPassword(h, 'correct horse battery')).toBe(true);
    expect(await verifyPassword(h, 'wrong')).toBe(false);
    expect(await verifyPassword(undefined, 'correct horse battery')).toBe(false);
  });
});

describe('createLimiter', () => {
  it('blocks after max attempts inside the window and recovers after it', () => {
    let t = 0;
    const l = createLimiter(3, 1000, () => t);
    expect([1, 2, 3, 4].map(() => l.attempt('a'))).toEqual([true, true, true, false]);
    expect(l.attempt('b')).toBe(true); // keys are independent
    t = 1001;
    expect(l.attempt('a')).toBe(true);
  });
  it('reset clears a key', () => {
    const l = createLimiter(1, 1000, () => 0);
    l.attempt('a');
    expect(l.attempt('a')).toBe(false);
    l.reset('a');
    expect(l.attempt('a')).toBe(true);
  });
});
