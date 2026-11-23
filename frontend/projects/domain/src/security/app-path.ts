/** A slash, then anything but a second slash or a backslash; no whitespace or control character. */
const APP_PATH = /^\/(?![/\\])[^\s\p{Cc}]*$/u;

/**
 * Whether `value` is a path inside the app, safe to navigate to from a link's query (L2-043 AC6,
 * L2-004 AC6). Browsers read a backslash as a slash and drop tabs and line breaks, so `/\host` and
 * `/<tab>/host` would leave the app like `//host`.
 */
export function isAppPath(value: unknown): value is string {
  return typeof value === 'string' && APP_PATH.test(value);
}
