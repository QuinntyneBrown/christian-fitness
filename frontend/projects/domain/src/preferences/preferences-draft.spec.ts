import type { PreferencesValuesDto } from '@cf/api';
import {
  EMAIL_SWITCHES,
  emailSummary,
  mayLeave,
  NOTIFICATION_SWITCHES,
  offersTurnOffAllEmail,
  preferencesDiffer,
  PRIVACY_SWITCHES,
  saveBarOf,
  SUGGESTION_AREAS,
  turnOffAllEmail,
  valuesOf,
  VISIBILITY_OPTIONS,
} from './preferences-draft';

const SAVED: PreferencesValuesDto = {
  email: { weekly: true, eventAlerts: true, trainingPlan: false, devotion: true },
  notifications: {
    eventReminders: true,
    messages: true,
    followedListingDates: true,
    eventChanges: true,
  },
  privacy: {
    visibility: 'members',
    showHomeChurch: false,
    showOnAttendeeLists: true,
    letAnyoneMessage: false,
  },
  suggestions: { area: 'scarborough', interests: ['running', 'strength'] },
};

// L2-064 AC2, AC4: the four emails and the four notification switches, each with a name and a description.
describe('the switches', () => {
  it('names the Weekly and its three extras, and the four notification kinds', () => {
    expect(EMAIL_SWITCHES.map((s) => [s.key, s.label])).toEqual([
      ['weekly', 'The Abundant Weekly'],
      ['eventAlerts', 'Event alerts'],
      ['trainingPlan', 'Training plan of the week'],
      ['devotion', 'Morning devotion'],
    ]);
    expect(NOTIFICATION_SWITCHES.map((s) => [s.key, s.label])).toEqual([
      ['eventReminders', 'Event reminders'],
      ['messages', 'Messages'],
      ['followedListingDates', 'New dates from listings you follow'],
      ['eventChanges', 'Changes to your events'],
    ]);
    expect(
      [...EMAIL_SWITCHES, ...NOTIFICATION_SWITCHES].every((s) => s.description.length > 0),
    ).toBe(true);
    // The extras say they do not send yet (AC2).
    expect(EMAIL_SWITCHES.slice(1).every((s) => s.description.endsWith('Not sending yet.'))).toBe(
      true,
    );
  });
});

// L2-064 AC2, AC3: "<n> of 4 emails on.", Turn off all email, and what the section reads with none on.
describe('email', () => {
  it.each<[boolean[], string, boolean]>([
    [[true, true, false, true], '3 of 4 emails on.', true],
    [[true, false, false, false], '1 of 4 emails on.', true],
    [[true, true, true, true], '4 of 4 emails on.', true],
    [
      [false, false, false, false],
      'You won’t get any email from us except security and service notices.',
      false,
    ],
  ])('with %j on reads "%s" and offers Turn off all email: %s', (on, text, offered) => {
    const email = { weekly: on[0], eventAlerts: on[1], trainingPlan: on[2], devotion: on[3] };
    expect(emailSummary(email)).toBe(text);
    expect(offersTurnOffAllEmail(email)).toBe(offered);
  });

  it('turns all four off and leaves the notifications as they are', () => {
    expect(turnOffAllEmail(SAVED)).toEqual({
      ...SAVED,
      email: { weekly: false, eventAlerts: false, trainingPlan: false, devotion: false },
    });
  });
});

// L2-064 AC5: the bar shows only while what is on screen differs from what is saved.
describe('preferencesDiffer', () => {
  it.each<[string, PreferencesValuesDto, boolean]>([
    ['the same', structuredClone(SAVED), false],
    ['an email switch', { ...SAVED, email: { ...SAVED.email, trainingPlan: true } }, true],
    [
      'a notification switch',
      { ...SAVED, notifications: { ...SAVED.notifications, messages: false } },
      true,
    ],
    ['the visibility', { ...SAVED, privacy: { ...SAVED.privacy, visibility: 'groups' } }, true],
    ['a privacy switch', { ...SAVED, privacy: { ...SAVED.privacy, letAnyoneMessage: true } }, true],
    ['the area', { ...SAVED, suggestions: { ...SAVED.suggestions, area: null } }, true],
    [
      'an interest more',
      {
        ...SAVED,
        suggestions: { ...SAVED.suggestions, interests: ['running', 'strength', 'cycling'] },
      },
      true,
    ],
    [
      'the same interests in another order',
      { ...SAVED, suggestions: { ...SAVED.suggestions, interests: ['strength', 'running'] } },
      false,
    ],
  ])('%s: %s', (_why, draft, differs) => {
    expect(preferencesDiffer(SAVED, draft)).toBe(differs);
  });

  it('takes the values out of what the API answers, without the name', () => {
    expect(valuesOf({ name: 'Grace Thompson', downloadRequestedAt: null, ...SAVED })).toEqual(
      SAVED,
    );
  });
});

// L2-064 AC5 to AC7: the bar's words, action and role in each state.
describe('saveBarOf', () => {
  it.each([
    ['clean', false, null],
    [
      'clean',
      true,
      { text: 'Unsaved changes', action: 'Save', busy: false, role: 'status', done: false },
    ],
    [
      'saving',
      true,
      { text: 'Unsaved changes', action: 'Saving…', busy: true, role: 'status', done: false },
    ],
    [
      'saved',
      false,
      { text: 'Preferences saved', action: null, busy: false, role: 'status', done: true },
    ],
    [
      'failed',
      true,
      {
        text: 'Couldn’t save. Your changes are still here.',
        action: 'Try again',
        busy: false,
        role: 'alert',
        done: false,
      },
    ],
  ] as const)('%s, dirty %s', (phase, dirty, bar) => {
    expect(saveBarOf(phase, dirty)).toEqual(bar);
  });
});

// L2-064 AC5: leaving with unsaved changes asks first.
describe('mayLeave', () => {
  it.each<[boolean, boolean, boolean, number]>([
    [false, false, true, 0],
    [true, true, true, 1],
    [true, false, false, 1],
  ])('unsaved %s, answer %s: leaves %s, asked %i time(s)', (unsaved, answer, leaves, asked) => {
    const questions: string[] = [];
    const ask = (question: string) => (questions.push(question), answer);

    expect(mayLeave({ hasUnsavedChanges: () => unsaved }, ask)).toBe(leaves);
    expect(questions).toHaveLength(asked);
    if (asked) expect(questions[0]).toBe('You have unsaved changes. Leave without saving?');
  });
});

// L2-065 AC1, AC5, AC6: the choices of Privacy and Suggestions.
describe('privacy and suggestions', () => {
  it('offers Anyone, Members and Just my groups, the three privacy switches and the eight areas', () => {
    expect(VISIBILITY_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      ['anyone', 'Anyone'],
      ['members', 'Members'],
      ['groups', 'Just my groups'],
    ]);
    expect(PRIVACY_SWITCHES.map((s) => [s.key, s.label])).toEqual([
      ['showHomeChurch', 'Show my home church'],
      ['showOnAttendeeLists', 'Show me on attendee lists'],
      ['letAnyoneMessage', 'Let anyone message me'],
    ]);
    expect(SUGGESTION_AREAS.map((a) => [a.value, a.label])).toEqual([
      ['toronto-east', 'Toronto East'],
      ['toronto-west', 'Toronto West'],
      ['downtown-toronto', 'Downtown Toronto'],
      ['scarborough', 'Scarborough'],
      ['north-york', 'North York'],
      ['mississauga', 'Mississauga'],
      ['brampton', 'Brampton'],
      ['durham', 'Durham'],
    ]);
  });
});
