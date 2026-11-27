import type { FeedbackCountsDto, FeedbackNoteDto } from '@cf/api';
import {
  feedbackFirstName,
  feedbackKindLabel,
  feedbackReplyHint,
  feedbackReplyToast,
  feedbackRowOf,
  feedbackSentFrom,
  feedbackStatusLabel,
  feedbackStatusOf,
  feedbackTabs,
  checkFeedbackReply,
} from './feedback-inbox';

const NOW = new Date('2026-04-15T12:45:00Z');

// L2-074 AC1: the same kind names as the form, and each status in words.
describe('the inbox in words', () => {
  it.each([
    ['idea', 'Idea'],
    ['problem', 'Something’s off'],
    ['correction', 'Correction'],
    ['thanks', 'Thanks'],
  ] as const)('names %s "%s"', (kind, label) => {
    expect(feedbackKindLabel(kind)).toBe(label);
  });

  it.each([
    ['new', 'New'],
    ['replied', 'Replied'],
    ['resolved', 'Resolved'],
  ] as const)('names the status %s "%s"', (status, label) => {
    expect(feedbackStatusLabel(status)).toBe(label);
  });

  it('reads a row: who, when, the text, the kind and status for assistive technology, New in bold', () => {
    expect(
      feedbackRowOf(
        {
          id: 'n1',
          kind: 'problem',
          sender: 'Michael Chen',
          sentAt: '2026-04-15T12:10:00Z',
          excerpt: 'It opens a blank page',
          status: 'new',
        },
        null,
        NOW,
      ),
    ).toEqual({
      id: 'n1',
      href: '/feedback?note=n1',
      kind: 'problem',
      from: 'Michael Chen',
      when: '35 min ago',
      text: 'It opens a blank page',
      label: 'Something’s off, New',
      isNew: true,
    });
    const replied = feedbackRowOf(
      {
        id: 'n2',
        kind: 'idea',
        sender: 'Grace',
        sentAt: '2026-04-14T12:10:00Z',
        excerpt: 'x',
        status: 'replied',
      },
      'replied',
      NOW,
    );
    expect([replied.href, replied.when, replied.label, replied.isNew]).toEqual([
      '/feedback?status=replied&note=n2',
      'Yesterday',
      'Idea, Replied',
      false,
    ]);
  });
});

// L2-074 AC2: All, New, Replied and Resolved, each with its count; the address names the tab.
describe('feedbackTabs and feedbackStatusOf', () => {
  it('lists the four tabs with their counts and addresses', () => {
    const counts: FeedbackCountsDto = { all: 4, new: 2, replied: 1, resolved: 1 };
    expect(feedbackTabs(counts)).toEqual([
      { label: 'All', href: '/feedback', count: 4 },
      { label: 'New', href: '/feedback?status=new', count: 2 },
      { label: 'Replied', href: '/feedback?status=replied', count: 1 },
      { label: 'Resolved', href: '/feedback?status=resolved', count: 1 },
    ]);
    expect(feedbackTabs(null).map((tab) => tab.count)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it.each<[string | null, string | null]>([
    ['new', 'new'],
    ['replied', 'replied'],
    ['resolved', 'resolved'],
    ['all', null],
    ['NEW', null],
    [null, null],
  ])('reads ?status=%s as %s', (param, status) => {
    expect(feedbackStatusOf(param)).toBe(status);
  });
});

// L2-074 AC3, AC5: who to reply to, a hint that suits the kind, where it was sent from.
describe('replying', () => {
  it.each<[string, string]>([
    ['Michael Chen', 'Michael'],
    ['  Adaeze  Kalu ', 'Adaeze'],
    ['', 'the member'],
  ])('replies to %j as %j', (name, first) => {
    expect(feedbackFirstName(name)).toBe(first);
  });

  it.each([
    ['idea', 'Tell them what happens next with the idea'],
    ['problem', 'Let them know we can reproduce it and when to expect a fix'],
    ['correction', 'Thank them and say when the correction is live'],
    ['thanks', 'Say thanks, and let them know who you passed it on to'],
  ] as const)('hints for %s', (kind, hint) => {
    expect(feedbackReplyHint(kind)).toBe(hint);
  });

  it.each<[string, string | null]>([
    ['', 'Write a reply before sending.'],
    ['   ', 'Write a reply before sending.'],
    ['Thanks!', null],
    ['x'.repeat(2001), 'Use 2,000 characters or fewer.'],
  ])('checks the reply %j', (text, error) => {
    expect(checkFeedbackReply(text)).toBe(error);
  });

  it.each<[FeedbackNoteDto['page'], string | null, string]>([
    [
      { routeTemplate: 'events/:id', title: 'Easter Sunrise 5K' },
      null,
      'Events › Easter Sunrise 5K',
    ],
    [
      { routeTemplate: 'stories/:slug', title: 'Twelve GTA churches' },
      's1',
      'Story › Twelve GTA churches',
    ],
    [{ routeTemplate: 'newsletter', title: null }, null, 'Newsletter'],
    [{ routeTemplate: 'events/series/:id', title: null }, null, 'Events'],
    [{ routeTemplate: null, title: 'A page' }, null, 'A page'],
    [{ routeTemplate: null, title: null }, null, 'Not recorded'],
    [{ routeTemplate: '', title: '' }, null, 'Not recorded'],
  ])('says %j was sent from %j', (page, storyId, text) => {
    expect(feedbackSentFrom(page, storyId)).toBe(text);
  });

  it('words the toast by how the reply went', () => {
    expect(feedbackReplyToast('email', 'Michael Chen')).toEqual({
      title: 'Reply sent',
      text: 'Reply sent. Michael Chen gets it by email.',
    });
    expect(feedbackReplyToast('message', 'Michael Chen')).toEqual({
      title: 'Reply sent',
      text: 'Michael Chen gets it as a message from Christian Fitness.',
    });
  });
});
