import {
  checkFeedbackNote,
  FEEDBACK_KINDS,
  feedbackQuestionOf,
  routeTemplateOf,
  startingFeedbackKind,
} from './feedback-form';

// L2-063 AC3: the four kinds in order, with the codes the API takes.
describe('FEEDBACK_KINDS', () => {
  it('lists Idea, Something’s off, Correction and Thanks with their codes', () => {
    expect(FEEDBACK_KINDS.map(({ value, label }) => [value, label])).toEqual([
      ['idea', 'Idea'],
      ['problem', 'Something’s off'],
      ['correction', 'Correction'],
      ['thanks', 'Thanks'],
    ]);
  });
});

// L2-063 AC3: one row per kind.
describe('feedbackQuestionOf', () => {
  it.each([
    {
      kind: 'idea' as const,
      question: 'What would make this better?',
      hint: 'For example: show which week of the plan each session is',
    },
    { kind: 'problem' as const, question: 'What happened?', hint: null },
    {
      kind: 'correction' as const,
      question: 'What should it say?',
      hint: 'The detail that’s wrong, and the right one if you know it',
    },
    { kind: 'thanks' as const, question: 'What’s been good?', hint: null },
  ])('asks "$question" for $kind', ({ kind, question, hint }) => {
    expect(feedbackQuestionOf(kind)).toEqual({ question, hint });
  });
});

// L2-063 AC2, AC3: Correction only when a story asks for it.
describe('startingFeedbackKind', () => {
  it.each([
    { kind: null, about: null, expected: 'idea' },
    { kind: null, about: 'page:home', expected: 'idea' },
    {
      kind: 'correction',
      about: 'story:018f0000-0000-7000-8000-000000000101',
      expected: 'correction',
    },
    { kind: 'correction', about: 'page:events/:id', expected: 'idea' },
    { kind: 'correction', about: null, expected: 'idea' },
    { kind: 'problem', about: 'story:018f0000-0000-7000-8000-000000000101', expected: 'idea' },
    { kind: 'Correction', about: 'story:018f0000-0000-7000-8000-000000000101', expected: 'idea' },
  ])('starts $kind about $about as $expected', ({ kind, about, expected }) => {
    expect(startingFeedbackKind(kind, about)).toBe(expected);
  });
});

// L2-063 AC5, AC8: one row per case, the limit's boundary included.
describe('checkFeedbackNote', () => {
  it.each([
    { why: 'empty', text: '', expected: 'Tell us a little more first.' },
    { why: 'only spaces', text: '   \n\t ', expected: 'Tell us a little more first.' },
    { why: 'one character', text: 'a', expected: null },
    { why: '2,000 characters', text: 'a'.repeat(2000), expected: null },
    { why: '2,000 characters with spaces around', text: `  ${'a'.repeat(2000)}  `, expected: null },
    { why: '2,001 characters', text: 'a'.repeat(2001), expected: 'Keep it to 2,000 characters.' },
  ])('$why: $expected', ({ text, expected }) => {
    expect(checkFeedbackNote(text)).toBe(expected);
  });
});

// ADR 0109: the template of the matched routes, root first.
describe('routeTemplateOf', () => {
  it.each([
    { paths: ['', '', 'home'], expected: 'home' },
    { paths: [undefined, '', '', 'events/:id'], expected: 'events/:id' },
    { paths: ['', '', 'events/series/:id/chat'], expected: 'events/series/:id/chat' },
    { paths: [], expected: '' },
  ])('$paths is $expected', ({ paths, expected }) => {
    expect(routeTemplateOf(paths)).toBe(expected);
  });
});
