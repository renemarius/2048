// Guest identity (specs/accounts-v2.5.md): signed-out players are labeled
// `UserXXXX`. The label is cosmetic — no server identity, no uniqueness
// guarantee — so a plain random number is enough.

const GUEST_PATTERN = /^User\d{4}$/;

/** `random` is injectable (defaults to Math.random) so tests are deterministic. */
export function generateGuestName(random: () => number = Math.random): string {
  const n = Math.min(9999, Math.max(0, Math.floor(random() * 10000)));
  return `User${String(n).padStart(4, '0')}`;
}

export function isGuestName(value: unknown): value is string {
  return typeof value === 'string' && GUEST_PATTERN.test(value);
}
