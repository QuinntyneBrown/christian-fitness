import type { AdminMemberFilter, AdminMemberQuery, MemberStatus } from '@cf/api';
import { COMMUNITY_TIME_ZONE } from '../events/going-date';

/** The longest search the API answers (L2-028 AC6); a longer one in the URL is cut to it. */
export const MEMBER_SEARCH_MAX = 100;

/** How long the search waits after the last key before it asks (ADR 0022). */
export const MEMBER_SEARCH_DELAY_MS = 300;

/** One tab of the staff list of members: its label, its link and whether it shows. */
export interface MemberTabView {
  label: string;
  href: string;
  current: boolean;
}

/** What the screen says in place of the table when it has nobody to list. */
export interface NoMembersMessage {
  heading: string;
  text: string;
  /** Whether a search is what left nobody, so the screen offers Clear search. */
  clearSearch: boolean;
}

const TABS: readonly { status: AdminMemberFilter; label: string }[] = [
  { status: 'all', label: 'All' },
  { status: 'active', label: 'Active' },
  { status: 'flagged', label: 'Flagged' },
  { status: 'suspended', label: 'Suspended' },
];

const TAB_EMPTY: Record<MemberStatus, { heading: string; text: string }> = {
  active: {
    heading: 'No active members',
    text: 'A member who is neither flagged nor suspended appears here.',
  },
  flagged: {
    heading: 'No flagged members',
    text: 'A member staff flag appears here until they are reinstated or suspended.',
  },
  suspended: {
    heading: 'No suspended members',
    text: 'A member staff suspend appears here until they are reinstated.',
  },
};

// Made once on first use, not at import: the formatters are costly to create.
let countFormat: Intl.NumberFormat | undefined;
let joinedFormat: Intl.DateTimeFormat | undefined;

/**
 * The list a Members URL names (L2-028; ADR 0022): `status` is one of the three statuses or else
 * everyone; `q` is trimmed and cut to the length the API answers; `page` is a whole number from 1
 * or else the first. Nothing in a URL can make a question the API refuses.
 */
export function memberListQueryOf(params: { get(name: string): string | null }): AdminMemberQuery {
  const status = params.get('status');
  const page = params.get('page') ?? '';
  return {
    status: status === 'active' || status === 'flagged' || status === 'suspended' ? status : 'all',
    q: (params.get('q') ?? '').trim().slice(0, MEMBER_SEARCH_MAX),
    page: /^[1-9]\d*$/.test(page) ? Number(page) : 1,
  };
}

/** The Members URL of `query`: only what differs from everyone, unsearched, on the first page. */
export function memberListHref(query: AdminMemberQuery): string {
  const params = new URLSearchParams();
  if (query.status !== 'all') params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.page > 1) params.set('page', String(query.page));
  const search = params.toString();
  return search ? `/members?${search}` : '/members';
}

/**
 * All, Active, Flagged and Suspended (mock `tabs`), `current` marked. A tab keeps the search and
 * returns to the first page.
 */
export function memberTabs(query: AdminMemberQuery): MemberTabView[] {
  return TABS.map(({ status, label }) => ({
    label,
    href: memberListHref({ status, q: query.q, page: 1 }),
    current: status === query.status,
  }));
}

/** The page subtitle: how many members the community has, such as "2,431 members". */
export function memberCountLabel(total: number): string {
  countFormat ??= new Intl.NumberFormat('en-CA');
  return `${countFormat.format(total)} ${total === 1 ? 'member' : 'members'}`;
}

/**
 * The day a member joined as the table shows it, in Toronto whatever the browser's zone: "Jan 12,
 * 2026" (mock `admin-members`). Empty for a value that is not an instant.
 */
export function joinedOn(joinedAt: string): string {
  const instant = new Date(joinedAt);
  if (Number.isNaN(instant.getTime())) return '';
  joinedFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: COMMUNITY_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return joinedFormat.format(instant);
}

/** How many pages `matches` members make at `pageSize` to a page; one even for nobody. */
export function memberPageCount(matches: number, pageSize: number): number {
  return Math.max(1, Math.ceil(matches / pageSize));
}

/** The pagination's summary, such as "Showing 26–50 of 2,431 members". */
export function memberRangeLabel(
  page: number,
  pageSize: number,
  shown: number,
  matches: number,
): string {
  const first = (page - 1) * pageSize + 1;
  const last = first + shown - 1;
  const range = last > first ? `${first}–${last}` : `${first}`;
  return `Showing ${range} of ${memberCountLabel(matches)}`;
}

/** A status as its badge and tab say it. */
export function memberStatusLabel(status: MemberStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * What the screen says with nobody to list (L2-028 AC4): a search names its term, whatever the
 * tab, since the search is what to change; a status with nobody says so; and a community with
 * nobody says where members come from.
 */
export function noMembersMessage(query: AdminMemberQuery): NoMembersMessage {
  if (query.q) {
    return {
      heading: `No members match “${query.q}”`,
      text: 'Check the spelling, or search by email instead.',
      clearSearch: true,
    };
  }
  if (query.status !== 'all') return { ...TAB_EMPTY[query.status], clearSearch: false };
  return {
    heading: 'No members yet',
    text: 'Members appear here when they create an account in the member app.',
    clearSearch: false,
  };
}
