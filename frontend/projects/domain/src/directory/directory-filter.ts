import type { DirectoryKindCountDto, ListingKind } from '@cf/api';
import { LISTING_KINDS } from './listing-kinds';

/** The shortest search the directory sends (L2-054 AC4; ADR 0077). */
export const DIRECTORY_SEARCH_MIN = 2;

/** The longest search the API accepts (ADR 0077); the field stops typing here. */
export const DIRECTORY_SEARCH_MAX = 100;

/** How long after the last keystroke the search is sent, in milliseconds (L2-054 AC4). */
export const DIRECTORY_SEARCH_DEBOUNCE_MS = 300;

/**
 * The search a typed text or an address's `q` asks for (L2-054 AC4): trimmed, none under 2
 * characters, and at most 100 characters, so the API never refuses it.
 */
export function directorySearchTerm(text: string | null): string | null {
  if (text === null) return null;
  const term = text.trim().slice(0, DIRECTORY_SEARCH_MAX).trim();
  return Array.from(term).length >= DIRECTORY_SEARCH_MIN ? term : null;
}

/** The directory's address for a kind and a search (ADR 0071): `/directory?kind=<kind>&q=<text>`. */
export function directoryHref(kind: ListingKind | null, q: string | null): string {
  const params = new URLSearchParams();
  if (kind !== null) params.set('kind', kind);
  if (q !== null) params.set('q', q);
  const query = params.toString();
  return query ? `/directory?${query}` : '/directory';
}

/** One kind chip (mock `directory/default`, `filtered`). */
export interface DirectoryKindChipView {
  label: string;
  /** The published listings it has, or "…" before the first answer. */
  count: string;
  href: string;
  current: boolean;
}

/**
 * All and the six kinds with their counts of published listings (L2-054 AC3): All is their sum.
 * Each keeps the search, so a chip narrows what was searched.
 */
export function directoryKindChips(
  current: ListingKind | null,
  counts: readonly DirectoryKindCountDto[] | null,
  q: string | null,
): DirectoryKindChipView[] {
  const countOf = (kind: ListingKind): string =>
    counts === null ? '…' : String(counts.find((c) => c.kind === kind)?.count ?? 0);
  const all = counts === null ? '…' : String(counts.reduce((sum, c) => sum + c.count, 0));
  return [
    { label: 'All', count: all, href: directoryHref(null, q), current: current === null },
    ...LISTING_KINDS.map((info) => ({
      label: info.plural,
      count: countOf(info.kind),
      href: directoryHref(info.kind, q),
      current: current === info.kind,
    })),
  ];
}

/** The no-results sentence for a search (mock `directory/no-results`; L2-054 AC5). */
export function noDirectoryMatchText(q: string): string {
  return `Nothing in the directory matches “${q}”. Know someone who should be listed? Our team checks every suggestion.`;
}
