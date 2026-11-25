import type { EventHostDto } from '@cf/api';
import { listingKindInfo } from '../directory/listing-kinds';

/** The shortest search the Host picker sends, in characters (code points) after trimming (ADR 0089). */
export const HOST_SEARCH_MIN = 2;

/** The longest search the API takes, as the directory's (ADR 0082). */
export const HOST_SEARCH_MAX = 100;

/** How long the Host picker waits after the last key before it searches, in milliseconds. */
export const HOST_SEARCH_DELAY_MS = 250;

/** One matching host as a pick card shows it (mock `event-editor/host-searching`). */
export interface HostChoiceView {
  id: string;
  title: string;
  /** "Organization · Listed". */
  meta: string;
}

/**
 * What the Host field's text searches for: the trimmed text, or `null` when it is under
 * {@link HOST_SEARCH_MIN} characters or over {@link HOST_SEARCH_MAX}, so nothing is asked.
 */
export function hostSearchTermOf(text: string): string | null {
  const term = text.trim();
  const length = Array.from(term).length;
  return length < HOST_SEARCH_MIN || term.length > HOST_SEARCH_MAX ? null : term;
}

/** A matching host as its pick card reads. */
export function hostChoiceViewOf(host: EventHostDto): HostChoiceView {
  return { id: host.id, title: host.name, meta: `${listingKindInfo(host.kind).singular} · Listed` };
}

/** The status line when a search matched nothing (mock `event-editor/host-no-results`). */
export function hostNoMatchesText(term: string): string {
  return `No Listed hosts match “${term}”. Try another search.`;
}

/** The status line when a search got no answer (ADR 0089's stand-in; no mock draws it). */
export const HOST_SEARCH_FAILED_TEXT =
  "Couldn't search hosts. Check your connection and type again.";
