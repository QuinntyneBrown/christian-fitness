/** The route of the server-error screen in both apps (L2-043 AC4). */
export const SERVER_ERROR_PATH = '/server-error';

/** `CF-` and the first eight hex digits of a trace id, upper case, as the API writes it. */
const REFERENCE = /^CF-[0-9A-F]{8}$/;

/** A slash, then anything but a second slash or a backslash; no whitespace or control character. */
const APP_PATH = /^\/(?![/\\])[^\s\p{Cc}]*$/u;

/**
 * The reference to show on the server-error screen: `value` when it is well formed, else `null`,
 * so a crafted link cannot put words of its own on the screen (L2-043 AC4).
 */
export function referenceOf(value: unknown): string | null {
  return typeof value === 'string' && REFERENCE.test(value) ? value : null;
}

/**
 * Where "Try again" goes: `value` when it is a path inside the app other than the server-error
 * screen itself, else `/` (L2-043 AC6). Browsers read a backslash as a slash and drop tabs and
 * line breaks, so `/\host` and `/<tab>/host` would leave the app like `//host`.
 */
export function returnPathOf(value: unknown): string {
  if (typeof value !== 'string' || !APP_PATH.test(value)) return '/';
  const path = value.split(/[?#]/, 1)[0];
  return path === SERVER_ERROR_PATH ? '/' : value;
}

/** What the server-error screen says; the reference sentence only with a well-formed reference. */
export function serverErrorText(reference: unknown): string {
  const owned = "That's on us, not you, and we've been notified. Try again in a moment.";
  const quoted = referenceOf(reference);
  return quoted ? `${owned} If it keeps happening, quote reference ${quoted}.` : owned;
}
