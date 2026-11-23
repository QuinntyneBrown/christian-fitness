import type { ApiHandlers, ApiReply } from './api-handlers';

/** A member as `GET /api/admin/members` answers them. */
export interface AdminMemberFixture {
  id: string;
  name: string;
  email: string;
  homeChurch: string | null;
  joinedAt: string;
  eventsAttended: number;
  status: 'active' | 'flagged' | 'suspended';
  /** Why staff last flagged or suspended them; none for a member nobody moderated. */
  note: string | null;
}

/** What the admin app asked the list for: its `status`, `q` and `page` parameters, as sent. */
export interface AskedMembers {
  status: string | null;
  q: string | null;
  page: string | null;
}

const member = (
  n: number,
  name: string,
  email: string,
  homeChurch: string | null,
  joinedAt: string,
  eventsAttended: number,
  status: AdminMemberFixture['status'] = 'active',
  note: string | null = null,
): AdminMemberFixture => ({
  id: `0190c0de-0000-7000-8000-0000000a00${String(n).padStart(2, '0')}`,
  name,
  email,
  homeChurch,
  joinedAt,
  eventsAttended,
  status,
  note,
});

/**
 * The seven members of the Members mock (docs/mocks/README.md, cast), in the mock's order, each
 * joined at noon in Toronto on the day the mock shows, in UTC.
 */
export const CAST_MEMBERS: AdminMemberFixture[] = [
  member(
    1,
    'Grace Thompson',
    'grace.thompson@gmail.com',
    'Grace Fellowship, Scarborough',
    '2026-01-12T17:00:00+00:00',
    9,
  ),
  member(
    2,
    'Michael Chen',
    'mchen.runs@outlook.com',
    'Toronto Chinese Baptist',
    '2025-11-03T17:00:00+00:00',
    14,
  ),
  member(
    3,
    'Priya Nair',
    'priya.nair@gmail.com',
    'Hope Church Mississauga',
    '2026-02-20T17:00:00+00:00',
    5,
  ),
  member(
    4,
    'Kevin Brooks',
    'kbrooks.fit@gmail.com',
    null,
    '2026-04-02T16:00:00+00:00',
    0,
    'flagged',
    'Promoting supplements in 3 group chats',
  ),
  member(
    5,
    'Adaeze Kalu',
    'adaeze.k@yahoo.ca',
    'RCCG Jesus House',
    '2025-12-08T17:00:00+00:00',
    11,
  ),
  member(6, 'Jordan Reid', 'jreid@rogers.com', 'The Meeting House', '2026-03-15T16:00:00+00:00', 2),
  member(
    7,
    'Tyler Simmons',
    'tsimmons22@gmail.com',
    null,
    '2026-03-30T16:00:00+00:00',
    0,
    'suspended',
    'Spam messages, suspended Apr 4',
  ),
];

/** `count` active members named "Member 001" onwards, for a list longer than one page. */
export function manyMembers(count: number): AdminMemberFixture[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(3, '0');
    return {
      id: `0190c0de-0000-7000-8000-0000000b0${n}`,
      name: `Member ${n}`,
      email: `member${n}@example.org`,
      homeChurch: null,
      joinedAt: '2026-03-01T17:00:00+00:00',
      eventsAttended: 0,
      status: 'active' as const,
      note: null,
    };
  });
}

/** How many members a page holds (L2-028 AC1). */
export const MEMBER_PAGE_SIZE = 25;

/**
 * A list answer: `members` as one page, out of `matches` who pass the search and status, in a
 * community of `total`.
 */
export function memberList(
  members: AdminMemberFixture[],
  counts: { total?: number; matches?: number; page?: number } = {},
): ApiReply {
  return {
    json: {
      total: counts.total ?? members.length,
      matches: counts.matches ?? members.length,
      page: counts.page ?? 1,
      pageSize: MEMBER_PAGE_SIZE,
      members,
    },
  };
}

/**
 * Answers every list request from `all` as the API does: the status keeps its members, the search
 * those whose name or email contains it in any case, and a page past the last answers the last.
 * `total` is the community's size (the length of `all` unless given). Records each question asked.
 */
export function answerMembers(
  api: ApiHandlers,
  all: AdminMemberFixture[] = CAST_MEMBERS,
  total = all.length,
): AskedMembers[] {
  const asked: AskedMembers[] = [];
  api.on('GET', '/api/admin/members', (request) => {
    const params = new URL(request.url()).searchParams;
    const status = params.get('status');
    const q = params.get('q');
    const page = params.get('page');
    asked.push({ status, q, page });
    const term = (q ?? '').trim().toLowerCase();
    const kept = all.filter(
      (m) =>
        (status === null || status === 'all' || m.status === status) &&
        (m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term)),
    );
    const last = Math.max(1, Math.ceil(kept.length / MEMBER_PAGE_SIZE));
    const answered = Math.min(Number(page ?? '1'), last);
    return memberList(kept.slice((answered - 1) * MEMBER_PAGE_SIZE, answered * MEMBER_PAGE_SIZE), {
      total,
      matches: kept.length,
      page: answered,
    });
  });
  return asked;
}
