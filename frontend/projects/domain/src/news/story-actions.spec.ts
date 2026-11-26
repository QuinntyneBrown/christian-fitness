import { storyActions, storyActionToast, storyPublishProblem } from './story-actions';

// L2-069 AC2, AC3, AC4, AC5: the design's table of actions by status, with a time chosen or not.
describe('storyActions', () => {
  it.each([
    [
      'draft',
      [
        ['submit', 'Send for review', false],
        ['publish', 'Publish now', true],
      ],
    ],
    [
      'review',
      [
        ['return-to-draft', 'Back to draft', false],
        ['publish', 'Approve & publish', true],
      ],
    ],
    [
      'published',
      [
        ['unpublish', 'Unpublish', false],
        ['update', 'Update', true],
      ],
    ],
    [
      'scheduled',
      [
        ['unschedule', 'Unschedule', false],
        ['publish', 'Publish now', true],
      ],
    ],
  ] as const)('a %s story offers %j', (status, expected) => {
    expect(storyActions(status).map((a) => [a.action, a.label, a.primary])).toEqual(expected);
  });

  it.each([
    [
      'draft',
      [
        ['submit', 'Send for review', false],
        ['schedule', 'Schedule', true],
      ],
    ],
    [
      'review',
      [
        ['return-to-draft', 'Back to draft', false],
        ['schedule', 'Approve & schedule', true],
      ],
    ],
    [
      'scheduled',
      [
        ['unschedule', 'Unschedule', false],
        ['publish', 'Publish now', true],
      ],
    ],
    [
      'published',
      [
        ['unpublish', 'Unpublish', false],
        ['update', 'Update', true],
      ],
    ],
  ] as const)('a %s story with a date and time chosen offers %j', (status, expected) => {
    expect(storyActions(status, true).map((a) => [a.action, a.label, a.primary])).toEqual(expected);
  });
});

// L2-069 AC6: the toast names what happened.
describe('storyActionToast', () => {
  it.each([
    ['submit', 'draft', 'community', 'Sent for review', 'It waits under In review on Stories.'],
    ['return-to-draft', 'review', null, 'Back to draft', 'It is a Draft again. No one was told.'],
    [
      'publish',
      'draft',
      'community',
      'Published',
      'It is on the front page and in the Community feed.',
    ],
    [
      'publish',
      'review',
      'nutrition',
      'Approved and published',
      'It is on the front page and in the Nutrition feed.',
    ],
    ['publish', 'draft', null, 'Published', 'It is on the front page and in the All stories feed.'],
    ['update', 'published', 'pros', 'Update published', 'Readers see the changes now.'],
    [
      'unpublish',
      'published',
      'pros',
      'Unpublished',
      'It is a Draft again, off the front page, the feeds and its address.',
    ],
    [
      'unschedule',
      'scheduled',
      'events',
      'Unscheduled',
      'It is a Draft again and will not go out.',
    ],
  ] as const)('%s from %s in %s', (action, from, section, title, text) => {
    expect(storyActionToast(action, from, section)).toEqual({ title, text });
  });

  // Saturday April 18, 6:00 AM in Toronto, seen on Wednesday the 15th.
  it.each([
    ['draft', 'Scheduled'],
    ['review', 'Approved and scheduled'],
  ] as const)('schedule from %s names the time it goes out', (from, title) => {
    expect(
      storyActionToast(
        'schedule',
        from,
        'events',
        '2026-04-18T10:00:00Z',
        new Date('2026-04-15T12:45:00Z'),
      ),
    ).toEqual({ title, text: 'It goes out Sat Apr 18, 6:00 AM.' });
  });
});

// L2-069 AC7; mock admin-story-editor/invalid.
describe('storyPublishProblem', () => {
  const rule = 'A story needs a headline, some text, a section and a byline to go out.';
  it.each([
    [{ headline: 'headline_required' }, 'Add a headline before publishing', rule],
    [{ text: 'text_required' }, 'Add some text before publishing', rule],
    [
      { section: 'section_required', bylineId: 'byline_required' },
      'Add a section and a byline before publishing',
      rule,
    ],
    [
      {
        bylineId: 'byline_required',
        text: 'text_required',
        headline: 'headline_required',
        section: 'section_required',
      },
      'Add a headline, some text, a section and a byline before publishing',
      rule,
    ],
    [
      { slug: 'slug_taken' },
      'Check the marked fields before publishing',
      'Change what is marked, then publish again.',
    ],
    [
      { headline: 'headline_too_long' },
      'Check the marked fields before publishing',
      'Change what is marked, then publish again.',
    ],
  ])('%j', (fieldCodes, title, text) => {
    expect(storyPublishProblem(fieldCodes)).toEqual({ title, text });
  });

  // L2-069 AC7: scheduling names a missing date or time, and a time not after now.
  const scheduleRule =
    'A story needs a headline, some text, a section, a byline, a date and a time to be scheduled.';
  it.each([
    [
      { publishDate: 'publish_date_required', publishTime: 'publish_time_required' },
      'Add a date and a time before scheduling',
      scheduleRule,
    ],
    [{ publishTime: 'publish_time_required' }, 'Add a time before scheduling', scheduleRule],
    [
      { headline: 'headline_required', publishDate: 'publish_date_required' },
      'Add a headline and a date before scheduling',
      scheduleRule,
    ],
    [
      { publishDate: 'publish_at_in_past' },
      'Choose a time after now',
      'A scheduled story goes out at a date and time still to come.',
    ],
    [
      { headline: 'headline_required', publishDate: 'publish_at_in_past' },
      'Add a headline before scheduling',
      scheduleRule,
    ],
    [
      { slug: 'slug_taken' },
      'Check the marked fields before scheduling',
      'Change what is marked, then schedule again.',
    ],
  ])('scheduling %j', (fieldCodes, title, text) => {
    expect(storyPublishProblem(fieldCodes, true)).toEqual({ title, text });
  });
});
