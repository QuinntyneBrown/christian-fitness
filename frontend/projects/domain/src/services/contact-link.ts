/** The longest contact link the API keeps (ADR 0000). */
const CONTACT_URL_MAX_LENGTH = 2000;

/**
 * The contact link as the page may open it, or `null` (L2-014 AC2; ADR 0053): an absolute http or
 * https address of at most 2,000 characters with a host and no sign-in details, trimmed. The API
 * keeps only such links; the page checks again before it opens a window, so no other scheme (such as
 * `javascript:`) is ever opened.
 */
export function safeContactUrl(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > CONTACT_URL_MAX_LENGTH) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  const web = parsed.protocol === 'https:' || parsed.protocol === 'http:';
  const credentials = parsed.username !== '' || parsed.password !== '';
  return web && parsed.hostname !== '' && !credentials ? trimmed : null;
}
