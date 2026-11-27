import type { IssueDto } from '@cf/api';
import { issueBarText, issueGreeting, issueNumberOf, issueWordsOf } from './issue-view';

const ISSUE: IssueDto = {
  number: 48,
  // Saturday 11 April 2026, 7:00 AM in Toronto.
  date: '2026-04-11T11:00:00Z',
  name: 'The Abundant Weekly',
  editorsNote: 'Spring finally showed up.',
  lead: {
    slug: 'basement-gym',
    section: 'community',
    headline: 'A West End church turned its basement into a free gym',
    summary: 'Rowers, kettlebells and a Thursday prayer circle.',
    author: 'Naomi Clarke',
    image: { key: 'abc.jpg', crop: { x: 0, y: 0, width: 16, height: 9 } },
  },
  briefs: [
    {
      slug: 'meal prep',
      section: 'nutrition',
      headline: 'Inside the kitchen',
      summary: '',
      author: 'Priya Raman',
      image: null,
    },
    {
      slug: 'no-section',
      section: null,
      headline: 'Unfiled',
      summary: '',
      author: null,
      image: null,
    },
  ],
  events: [
    {
      id: 'e1',
      title: 'Easter Sunrise 5K',
      startsAt: '2026-04-18T10:45:00Z',
      area: 'Waterfront, Toronto',
      priceCents: 0,
    },
    {
      id: 'e2',
      title: 'Saturday Park Bootcamp',
      startsAt: '2026-04-25T12:00:00Z',
      area: 'Waterfront, Toronto',
      priceCents: 1000,
    },
  ],
  verse: 'Do you not know?',
  verseReference: '1 Corinthians 6:19',
};

// L2-059 AC2: only a signed-in member is greeted, by first name.
describe('issueGreeting', () => {
  it.each<[string | null, string | null]>([
    ['Grace Thompson', 'Morning, Grace.'],
    ['  Grace  ', 'Morning, Grace.'],
    ['', null],
    ['   ', null],
    [null, null],
  ])('greets %j with %j', (name, greeting) => {
    expect(issueGreeting(name)).toBe(greeting);
  });
});

describe('issueBarText and issueNumberOf', () => {
  it('names the issue once its number is known', () => {
    expect(issueBarText(48)).toBe('Issue 48 · web version');
    expect(issueBarText(null)).toBe('Web version');
  });

  it.each<[string | null, number | null]>([
    ['48', 48],
    ['1', 1],
    ['0', null],
    ['-3', null],
    ['4.5', null],
    ['abc', null],
    ['', null],
    [null, null],
  ])('reads %j as issue %j', (param, number) => {
    expect(issueNumberOf(param)).toBe(number);
  });
});

// L2-059 AC1: the issue in words, its dates and times in Toronto.
describe('issueWordsOf', () => {
  it('words the masthead, the big story, the calendar and the briefs', () => {
    const words = issueWordsOf(ISSUE, 'Grace Thompson');

    expect(words.date).toBe('No. 48 · Saturday, April 11, 2026');
    expect(words.greeting).toBe('Morning, Grace.');
    expect(words.lead).toEqual({
      section: 'The big story · Community',
      title: 'A West End church turned its basement into a free gym',
      summary: 'Rowers, kettlebells and a Thursday prayer circle.',
      image: '/api/stories/images/abc.jpg',
      href: '/stories/basement-gym',
    });
    expect(words.events).toEqual([
      {
        id: 'e1',
        month: 'Apr',
        day: '18',
        title: 'Easter Sunrise 5K',
        meta: 'Sat 6:45 AM · Waterfront · Free',
      },
      {
        id: 'e2',
        month: 'Apr',
        day: '25',
        title: 'Saturday Park Bootcamp',
        meta: 'Sat 8:00 AM · Waterfront · $10',
      },
    ]);
    expect(words.briefs.map((b) => [b.href, b.section, b.title, b.author])).toEqual([
      ['/stories/meal%20prep', 'Nutrition', 'Inside the kitchen', 'Priya Raman'],
      ['/stories/no-section', '', 'Unfiled', ''],
    ]);
  });

  it('greets nobody without a session, and has no big story when it was unpublished', () => {
    const words = issueWordsOf({ ...ISSUE, lead: null }, null);

    expect(words.greeting).toBeNull();
    expect(words.lead).toBeNull();
  });
});
