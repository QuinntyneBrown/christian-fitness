/** What Google's answer brought back to the screen that started the sign-in (L2-049 AC5; ADR 0099). */
export type GoogleReturn = 'returned' | 'failed';

/**
 * Reads the `google` query parameter the API's callback sends the browser back with: `returned`
 * (finish the sign-in) or `failed` (it didn't finish). Anything else, or none (a cancel at Google,
 * or a plain visit), is nothing to do. The screen reads it once and drops it from the address.
 */
export function googleReturnOf(value: unknown): GoogleReturn | null {
  return value === 'returned' || value === 'failed' ? value : null;
}
