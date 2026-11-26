import { storyActions, storyActionToast, storyPublishProblem } from './story-actions';

// L2-069 AC2, AC3, AC5: the design's table of actions by status.
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
    ['scheduled', []],
  ] as const)('a %s story offers %j', (status, expected) => {
    expect(storyActions(status).map((a) => [a.action, a.label, a.primary])).toEqual(expected);
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
  ] as const)('%s from %s in %s', (action, from, section, title, text) => {
    expect(storyActionToast(action, from, section)).toEqual({ title, text });
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
});
