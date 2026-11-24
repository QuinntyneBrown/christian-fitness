import type { Router } from '@angular/router';
import { isAppPath } from '../security/app-path';

/** The route of the server-error screen in both apps (L2-043 AC4). */
export const SERVER_ERROR_PATH = '/server-error';

/** The route of the offline screen in both apps (L2-043 AC9; ADR 0046). */
export const OFFLINE_PATH = '/offline';

/** `CF-` and the first eight hex digits of a trace id, upper case, as the API writes it. */
const REFERENCE = /^CF-[0-9A-F]{8}$/;

/**
 * The reference to show on the server-error screen: `value` when it is well formed, else `null`,
 * so a crafted link cannot put words of its own on the screen (L2-043 AC4).
 */
export function referenceOf(value: unknown): string | null {
  return typeof value === 'string' && REFERENCE.test(value) ? value : null;
}

/**
 * Where "Try again" goes: `value` when it is a path inside the app (`isAppPath`) other than the
 * server-error or offline screen itself, else `/` (L2-043 AC6, AC9).
 */
export function returnPathOf(value: unknown): string {
  if (!isAppPath(value)) return '/';
  const path = pathOf(value);
  return path === SERVER_ERROR_PATH || path === OFFLINE_PATH ? '/' : value;
}

/** What the server-error screen says; the reference sentence only with a well-formed reference. */
export function serverErrorText(reference: unknown): string {
  const owned = "That's on us, not you, and we've been notified. Try again in a moment.";
  const quoted = referenceOf(reference);
  return quoted ? `${owned} If it keeps happening, quote reference ${quoted}.` : owned;
}

/** The URL that failed: where a navigation still in flight is going, or else where the router is. */
export function failedRouteOf(router: Router): string {
  const navigation = router.currentNavigation();
  return navigation
    ? router.serializeUrl(navigation.finalUrl ?? navigation.extractedUrl)
    : router.url;
}

/** True when `url` targets the backend API (`/api/`), or the part of it under `prefix`. */
export function isApiUrl(url: string, prefix = '/api/'): boolean {
  return new URL(url, 'http://app.invalid').pathname.startsWith(prefix);
}

/** `url` without its query and fragment. */
export function pathOf(url: string): string {
  return url.split(/[?#]/, 1)[0];
}
