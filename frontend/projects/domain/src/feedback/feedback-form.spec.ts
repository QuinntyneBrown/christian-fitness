import {
  checkFeedbackNote,
  checkFeedbackScreenshot,
  FEEDBACK_KINDS,
  feedbackQuestionOf,
  feedbackRefusalOf,
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

// L2-063 AC7, AC8, AC9 (ADR 0109): what the form shows for each answer that is not a success.
describe('feedbackRefusalOf', () => {
  it.each([
    {
      why: 'the hourly limit',
      error: { status: 429, code: 'too_many_attempts' },
      expected: { kind: 'limit' },
    },
    {
      why: 'a note too long',
      error: { status: 400, code: 'validation_failed', fieldCodes: { text: 'field_too_long' } },
      expected: { kind: 'note', message: 'Keep it to 2,000 characters.' },
    },
    {
      why: 'an empty note',
      error: { status: 400, code: 'validation_failed', fieldCodes: { text: 'text_required' } },
      expected: { kind: 'note', message: 'Tell us a little more first.' },
    },
    {
      why: 'a screenshot too large',
      error: {
        status: 400,
        code: 'validation_failed',
        fieldCodes: { screenshot: 'image_too_large' },
      },
      expected: { kind: 'screenshot', message: 'Use a JPEG, PNG or WebP image up to 5 MB' },
    },
    {
      why: 'a screenshot of another type',
      error: {
        status: 400,
        code: 'validation_failed',
        fieldCodes: { screenshot: 'image_type_not_allowed' },
      },
      expected: { kind: 'screenshot', message: 'Use a JPEG, PNG or WebP image up to 5 MB' },
    },
    {
      why: 'a screenshot on another kind',
      error: {
        status: 400,
        code: 'validation_failed',
        fieldCodes: { screenshot: 'screenshot_not_allowed' },
      },
      expected: { kind: 'failed' },
    },
    {
      why: 'a field the form does not show',
      error: { status: 400, code: 'validation_failed', fieldCodes: { kind: 'kind_invalid' } },
      expected: { kind: 'failed' },
    },
    {
      why: 'a server error',
      error: { status: 500, code: 'server_error' },
      expected: { kind: 'failed' },
    },
    { why: 'no answer', error: { status: 0, code: 'network_error' }, expected: { kind: 'failed' } },
    { why: 'something else', error: new Error('boom'), expected: { kind: 'failed' } },
    { why: 'nothing', error: null, expected: { kind: 'failed' } },
  ])('$why', ({ error, expected }) => {
    expect(feedbackRefusalOf(error)).toEqual(expected);
  });
});

// L2-063 AC4: a screenshot is checked in the browser by its type and size; one case per row, the
// 5 MB boundary included.
describe('checkFeedbackScreenshot', () => {
  const MB = 1024 * 1024;
  it.each([
    { why: 'a PNG', type: 'image/png', size: 2048, expected: null },
    { why: 'a JPEG of exactly 5 MB', type: 'image/jpeg', size: 5 * MB, expected: null },
    { why: 'a WebP', type: 'image/webp', size: 1, expected: null },
    {
      why: 'a PNG of 5 MB and a byte',
      type: 'image/png',
      size: 5 * MB + 1,
      expected: 'Use a JPEG, PNG or WebP image up to 5 MB',
    },
    {
      why: 'a GIF',
      type: 'image/gif',
      size: 2048,
      expected: 'Use a JPEG, PNG or WebP image up to 5 MB',
    },
    {
      why: 'a PDF',
      type: 'application/pdf',
      size: 2048,
      expected: 'Use a JPEG, PNG or WebP image up to 5 MB',
    },
    {
      why: 'a file of no type',
      type: '',
      size: 2048,
      expected: 'Use a JPEG, PNG or WebP image up to 5 MB',
    },
  ])('$why: $expected', ({ type, size, expected }) => {
    expect(checkFeedbackScreenshot({ type, size })).toBe(expected);
  });
});
