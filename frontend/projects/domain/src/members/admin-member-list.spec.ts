import type { AdminMemberQuery } from '@cf/api';
import {
  joinedOn,
  memberCountLabel,
  memberListHref,
  memberListQueryOf,
  memberPageCount,
  memberRangeLabel,
  memberStatusLabel,
  memberTabs,
  noMembersMessage,
} from './admin-member-list';

const params = (query: string) => new URLSearchParams(query);
const ALL: AdminMemberQuery = { status: 'all', q: '', page: 1 };

// L2-028 (ADR 0022): the URL is the Members screen's state.
describe('memberListQueryOf', () => {
  it.each([
    { why: 'nothing in the URL', url: '', expected: ALL },
    { why: 'a status', url: 'status=flagged', expected: { ...ALL, status: 'flagged' } },
    { why: 'active', url: 'status=active', expected: { ...ALL, status: 'active' } },
    { why: 'suspended', url: 'status=suspended', expected: { ...ALL, status: 'suspended' } },
    { why: 'all, written out', url: 'status=all', expected: ALL },
    { why: 'a status the list has no tab for', url: 'status=banned', expected: ALL },
    { why: 'a status in another case', url: 'status=Flagged', expected: ALL },
    { why: 'a search', url: 'q=grace', expected: { ...ALL, q: 'grace' } },
    {
      why: 'a search with spaces around it',
      url: 'q=%20grace%20%20',
      expected: { ...ALL, q: 'grace' },
    },
    { why: 'a search of spaces', url: 'q=%20%20', expected: ALL },
    { why: 'a search keeps its case', url: 'q=Grace+T', expected: { ...ALL, q: 'Grace T' } },
    {
      why: 'a search of 100 characters',
      url: `q=${'g'.repeat(100)}`,
      expected: { ...ALL, q: 'g'.repeat(100) },
    },
    {
      why: 'a search of 101 is cut to the 100 the API answers',
      url: `q=${'g'.repeat(101)}`,
      expected: { ...ALL, q: 'g'.repeat(100) },
    },
    { why: 'a page', url: 'page=3', expected: { ...ALL, page: 3 } },
    { why: 'page 1', url: 'page=1', expected: ALL },
    { why: 'page 0', url: 'page=0', expected: ALL },
    { why: 'a page below 0', url: 'page=-2', expected: ALL },
    { why: 'a page that is not a whole number', url: 'page=2.5', expected: ALL },
    { why: 'a page that is not a number', url: 'page=two', expected: ALL },
    {
      why: 'all three',
      url: 'status=active&q=gmail&page=2',
      expected: { status: 'active', q: 'gmail', page: 2 },
    },
  ])('$why ($url)', ({ url, expected }) => {
    expect(memberListQueryOf(params(url))).toEqual(expected);
  });
});

describe('memberListHref', () => {
  it.each([
    { why: 'everyone, first page', query: ALL, expected: '/members' },
    {
      why: 'a status',
      query: { ...ALL, status: 'flagged' as const },
      expected: '/members?status=flagged',
    },
    { why: 'a search', query: { ...ALL, q: 'grace' }, expected: '/members?q=grace' },
    { why: 'a page', query: { ...ALL, page: 2 }, expected: '/members?page=2' },
    {
      why: 'all three, in one order',
      query: { status: 'active' as const, q: 'gmail', page: 3 },
      expected: '/members?status=active&q=gmail&page=3',
    },
    {
      why: 'a search that needs encoding',
      query: { ...ALL, q: 'a&b =c@d' },
      expected: '/members?q=a%26b%20%3Dc%40d',
    },
  ])('$why is $expected', ({ query, expected }) => {
    expect(memberListHref(query)).toBe(expected);
  });

  it('reads back what it wrote', () => {
    const query: AdminMemberQuery = { status: 'suspended', q: 'a&b =c@d', page: 4 };
    const href = memberListHref(query);
    expect(memberListQueryOf(params(href.slice(href.indexOf('?') + 1)))).toEqual(query);
  });
});

describe('memberTabs', () => {
  it('lists All, Active, Flagged and Suspended with their links and the current one', () => {
    expect(memberTabs({ ...ALL, status: 'flagged' })).toEqual([
      { label: 'All', href: '/members', current: false },
      { label: 'Active', href: '/members?status=active', current: false },
      { label: 'Flagged', href: '/members?status=flagged', current: true },
      { label: 'Suspended', href: '/members?status=suspended', current: false },
    ]);
  });

  it('keeps the search and returns to the first page', () => {
    expect(memberTabs({ status: 'active', q: 'gmail', page: 3 }).map((tab) => tab.href)).toEqual([
      '/members?q=gmail',
      '/members?status=active&q=gmail',
      '/members?status=flagged&q=gmail',
      '/members?status=suspended&q=gmail',
    ]);
  });
});

describe('memberCountLabel', () => {
  it.each([
    { total: 0, expected: '0 members' },
    { total: 1, expected: '1 member' },
    { total: 2, expected: '2 members' },
    { total: 999, expected: '999 members' },
    { total: 2431, expected: '2,431 members' },
    { total: 1234567, expected: '1,234,567 members' },
  ])('$total is "$expected"', ({ total, expected }) => {
    expect(memberCountLabel(total)).toBe(expected);
  });
});

// Every date on screen is read in Toronto (ADR 0015), whatever the browser's zone.
describe('joinedOn', () => {
  it.each([
    { why: 'midday in Toronto', joinedAt: '2026-01-12T17:00:00+00:00', expected: 'Jan 12, 2026' },
    {
      why: 'a one-digit day has no leading zero',
      joinedAt: '2025-11-03T15:00:00+00:00',
      expected: 'Nov 3, 2025',
    },
    {
      why: 'late evening in Toronto is already tomorrow in UTC',
      joinedAt: '2026-04-03T03:30:00+00:00',
      expected: 'Apr 2, 2026',
    },
    {
      why: 'the last minute of the day in Toronto, in winter (UTC-5)',
      joinedAt: '2026-01-13T04:59:00+00:00',
      expected: 'Jan 12, 2026',
    },
    {
      why: 'midnight in Toronto, in winter',
      joinedAt: '2026-01-13T05:00:00+00:00',
      expected: 'Jan 13, 2026',
    },
    {
      why: 'the last minute of the day in Toronto, in summer (UTC-4)',
      joinedAt: '2026-07-01T03:59:00+00:00',
      expected: 'Jun 30, 2026',
    },
    {
      why: 'midnight in Toronto, in summer',
      joinedAt: '2026-07-01T04:00:00+00:00',
      expected: 'Jul 1, 2026',
    },
    { why: 'not an instant', joinedAt: 'soon', expected: '' },
  ])('$why: $joinedAt is "$expected"', ({ joinedAt, expected }) => {
    expect(joinedOn(joinedAt)).toBe(expected);
  });
});

describe('memberPageCount', () => {
  it.each([
    { matches: 0, expected: 1 },
    { matches: 1, expected: 1 },
    { matches: 25, expected: 1 },
    { matches: 26, expected: 2 },
    { matches: 50, expected: 2 },
    { matches: 2431, expected: 98 },
  ])('$matches members at 25 to a page are $expected page(s)', ({ matches, expected }) => {
    expect(memberPageCount(matches, 25)).toBe(expected);
  });
});

describe('memberRangeLabel', () => {
  it.each([
    {
      why: 'the first of many pages',
      page: 1,
      shown: 25,
      matches: 2431,
      expected: 'Showing 1–25 of 2,431 members',
    },
    {
      why: 'a middle page',
      page: 2,
      shown: 25,
      matches: 2431,
      expected: 'Showing 26–50 of 2,431 members',
    },
    {
      why: 'a short last page',
      page: 2,
      shown: 6,
      matches: 31,
      expected: 'Showing 26–31 of 31 members',
    },
    {
      why: 'a last page of one',
      page: 2,
      shown: 1,
      matches: 26,
      expected: 'Showing 26 of 26 members',
    },
    { why: 'one member', page: 1, shown: 1, matches: 1, expected: 'Showing 1 of 1 member' },
  ])('$why is "$expected"', ({ page, shown, matches, expected }) => {
    expect(memberRangeLabel(page, 25, shown, matches)).toBe(expected);
  });
});

describe('memberStatusLabel', () => {
  it.each([
    { status: 'active' as const, expected: 'Active' },
    { status: 'flagged' as const, expected: 'Flagged' },
    { status: 'suspended' as const, expected: 'Suspended' },
  ])('$status is $expected', ({ status, expected }) => {
    expect(memberStatusLabel(status)).toBe(expected);
  });
});

// L2-028 AC4 (mocks `no-results`, `tab-empty`, `empty`): what the screen says with nobody to list.
describe('noMembersMessage', () => {
  it.each([
    {
      why: 'a search nobody matches names the term and offers to clear it',
      query: { ...ALL, q: 'Jessica' },
      expected: {
        heading: 'No members match “Jessica”',
        text: 'Check the spelling, or search by email instead.',
        clearSearch: true,
      },
    },
    {
      why: 'a search within a status says the same: the search is what to change',
      query: { status: 'flagged' as const, q: 'grace', page: 1 },
      expected: {
        heading: 'No members match “grace”',
        text: 'Check the spelling, or search by email instead.',
        clearSearch: true,
      },
    },
    {
      why: 'nobody active',
      query: { ...ALL, status: 'active' as const },
      expected: {
        heading: 'No active members',
        text: 'A member who is neither flagged nor suspended appears here.',
        clearSearch: false,
      },
    },
    {
      why: 'nobody flagged',
      query: { ...ALL, status: 'flagged' as const },
      expected: {
        heading: 'No flagged members',
        text: 'A member staff flag appears here until they are reinstated or suspended.',
        clearSearch: false,
      },
    },
    {
      why: 'nobody suspended',
      query: { ...ALL, status: 'suspended' as const },
      expected: {
        heading: 'No suspended members',
        text: 'A member staff suspend appears here until they are reinstated.',
        clearSearch: false,
      },
    },
    {
      why: 'nobody at all',
      query: ALL,
      expected: {
        heading: 'No members yet',
        text: 'Members appear here when they create an account in the member app.',
        clearSearch: false,
      },
    },
  ])('$why', ({ query, expected }) => {
    expect(noMembersMessage(query)).toEqual(expected);
  });
});
