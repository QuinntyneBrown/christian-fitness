import { isAppPath } from './app-path';

/** Where a member lands after sign-in when there is no return address to follow (L2-004 AC1). */
export const SIGN_IN_DEFAULT_PATH = '/home';

/**
 * The address to open after sign-in, from the `returnUrl` the guard set (L2-004 AC6; ADR 0010):
 * followed only when it is a path inside the app other than the sign-in screen itself; anything
 * else, or none, opens Home. So a crafted link to sign in cannot send a member to another site.
 */
export function signInReturnPathOf(value: unknown): string {
  if (!isAppPath(value)) return SIGN_IN_DEFAULT_PATH;
  const path = value.split(/[?#]/, 1)[0];
  return path === '/sign-in' ? SIGN_IN_DEFAULT_PATH : value;
}
