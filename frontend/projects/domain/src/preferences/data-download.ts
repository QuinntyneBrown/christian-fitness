import type { ApiError } from '@cf/api';

/**
 * Where the download page ends when the link cannot be answered (L2-066 AC2; ADR 0117): the API
 * answers every id that is not the member's own working link with `not_found`, so the page says
 * the download has expired; anything else is a failure it offers to retry.
 */
export type DownloadOutcome = 'expired' | 'failed';

/** What a refused check means for the page; the code is never shown. */
export function downloadOutcomeOf(error: unknown): DownloadOutcome {
  const api = typeof error === 'object' && error !== null ? (error as Partial<ApiError>) : {};
  return api.code === 'not_found' ? 'expired' : 'failed';
}

// Made once on first use, not at import: the formatter is costly to create.
let dayInToronto: Intl.DateTimeFormat | undefined;

/**
 * What the page says once the download starts (mock `download/default`), with the link's last day
 * in Toronto: "… until April 22, 2026, …".
 */
export function downloadReadyText(expiresAt: string): string {
  const until = (dayInToronto ??= new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Toronto',
  })).format(new Date(expiresAt));
  return `Your data is on its way to your device. If it doesn't start, download it again. The link works for 7 days, until ${until}, and only while you're signed in.`;
}
