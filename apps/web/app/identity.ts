// Who the player is, and wiping it. Guests get a `UserXXXX` label
// (specs/accounts-v2.5.md), generated once and kept in localStorage. This
// is device-local by nature — a signed-in account will supersede it.

import { generateGuestName, isGuestName } from 'core';

export const GUEST_NAME_KEY = '2048-hangul:guestId';

export function loadOrCreateGuestName(): string {
  try {
    const stored = window.localStorage.getItem(GUEST_NAME_KEY);
    if (isGuestName(stored)) return stored;
    const created = generateGuestName();
    window.localStorage.setItem(GUEST_NAME_KEY, created);
    return created;
  } catch {
    return generateGuestName();
  }
}

// Reset wipes everything the app has stored (specs/settings-v2.md): every
// key under our prefix plus the un-prefixed theme key.
export function clearAllLocalData(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith('2048-hangul:') || key === 'theme')) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // nothing to clear if storage is unavailable
  }
}
