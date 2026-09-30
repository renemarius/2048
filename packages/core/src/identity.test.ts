import { describe, expect, it } from 'vitest';
import { generateGuestName, isGuestName } from './identity';

describe('generateGuestName', () => {
  it('formats as User + 4 digits, zero-padded', () => {
    expect(generateGuestName(() => 0)).toBe('User0000');
    expect(generateGuestName(() => 0.0042)).toBe('User0042');
    expect(generateGuestName(() => 0.5)).toBe('User5000');
  });

  it('never exceeds 4 digits, even for out-of-range rng output', () => {
    expect(generateGuestName(() => 0.99999999)).toBe('User9999');
    expect(generateGuestName(() => 1)).toBe('User9999');
  });

  it('always produces a name isGuestName accepts', () => {
    for (let i = 0; i < 200; i++) expect(isGuestName(generateGuestName())).toBe(true);
  });
});

describe('isGuestName', () => {
  it('rejects anything not exactly User + 4 digits', () => {
    for (const bad of ['User123', 'User12345', 'user1234', 'User12a4', '', null, 42]) {
      expect(isGuestName(bad)).toBe(false);
    }
    expect(isGuestName('User1234')).toBe(true);
  });
});
