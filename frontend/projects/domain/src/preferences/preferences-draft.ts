import type {
  EmailPreferencesDto,
  NotificationPreferencesDto,
  PreferencesDto,
  PreferencesValuesDto,
  PrivacyPreferencesDto,
  ProfileVisibilityName,
} from '@cf/api';

/** One switch on Preferences: the setting it changes, its name and its description. */
export interface PreferenceSwitch<K extends string> {
  key: K;
  label: string;
  description: string;
  /** The input's name. */
  name: string;
}

/** The Abundant Weekly and its three extras (L2-064 AC2; mock `preferences/default`). */
export const EMAIL_SWITCHES: readonly PreferenceSwitch<keyof EmailPreferencesDto>[] = [
  {
    key: 'weekly',
    label: 'The Abundant Weekly',
    description: 'The week’s stories and events. Every Saturday, 7 AM.',
    name: 'email-newsletter',
  },
  {
    key: 'eventAlerts',
    label: 'Event alerts',
    description: 'New runs, workouts and retreats. Not sending yet.',
    name: 'email-events',
  },
  {
    key: 'trainingPlan',
    label: 'Training plan of the week',
    description: 'A short session to do on your own. Not sending yet.',
    name: 'email-plan',
  },
  {
    key: 'devotion',
    label: 'Morning devotion',
    description: 'Scripture for body and spirit. Not sending yet.',
    name: 'email-devotion',
  },
];

/** The four notification switches, as the requirement names them (L2-064 AC4; ADR 0114). */
export const NOTIFICATION_SWITCHES: readonly PreferenceSwitch<keyof NotificationPreferencesDto>[] =
  [
    {
      key: 'eventReminders',
      label: 'Event reminders',
      description: 'A day before anything you’re going to',
      name: 'notify-reminders',
    },
    {
      key: 'messages',
      label: 'Messages',
      description: 'When someone sends you a direct message',
      name: 'notify-messages',
    },
    {
      key: 'followedListingDates',
      label: 'New dates from listings you follow',
      description: 'When anyone you follow posts an event',
      name: 'notify-follows',
    },
    {
      key: 'eventChanges',
      label: 'Changes to your events',
      description:
        'When an event or a series date you hold a place at is cancelled. We recommend keeping this on.',
      name: 'notify-changes',
    },
  ];

/** "Who can see your profile" (L2-065 AC1; mock `preferences/default`). */
export const VISIBILITY_OPTIONS: readonly {
  value: ProfileVisibilityName;
  label: string;
  description: string;
}[] = [
  { value: 'anyone', label: 'Anyone', description: 'Including people who aren’t signed in' },
  { value: 'members', label: 'Members', description: 'Anyone signed in to Christian Fitness' },
  {
    value: 'groups',
    label: 'Just my groups',
    description: 'People in the group chats you’re part of',
  },
];

/** The three privacy switches (L2-065 AC4, AC5, AC10). */
export const PRIVACY_SWITCHES: readonly PreferenceSwitch<
  Exclude<keyof PrivacyPreferencesDto, 'visibility'>
>[] = [
  {
    key: 'showHomeChurch',
    label: 'Show my home church',
    description:
      'Only signed-in members who can see your profile can see it. Never shown to visitors.',
    name: 'privacy-church',
  },
  {
    key: 'showOnAttendeeLists',
    label: 'Show me on attendee lists',
    description: 'Others going to an event can see you’re going',
    name: 'privacy-attendee',
  },
  {
    key: 'letAnyoneMessage',
    label: 'Let anyone message me',
    description: 'When off, only people in your groups can start a chat',
    name: 'privacy-dms',
  },
];

/** The eight areas a member chooses from (L2-065 AC6), by the codes the API takes. */
export const SUGGESTION_AREAS: readonly { value: string; label: string }[] = [
  { value: 'toronto-east', label: 'Toronto East' },
  { value: 'toronto-west', label: 'Toronto West' },
  { value: 'downtown-toronto', label: 'Downtown Toronto' },
  { value: 'scarborough', label: 'Scarborough' },
  { value: 'north-york', label: 'North York' },
  { value: 'mississauga', label: 'Mississauga' },
  { value: 'brampton', label: 'Brampton' },
  { value: 'durham', label: 'Durham' },
];

/** The settings of what the API answers, without the member's name. */
export function valuesOf(preferences: PreferencesDto): PreferencesValuesDto {
  return {
    email: { ...preferences.email },
    notifications: { ...preferences.notifications },
    privacy: { ...preferences.privacy },
    suggestions: {
      area: preferences.suggestions.area,
      interests: [...preferences.suggestions.interests],
    },
  };
}

/** "<n> of 4 emails on.", or what the section reads with none on (L2-064 AC2, AC3). */
export function emailSummary(email: EmailPreferencesDto): string {
  const on = EMAIL_SWITCHES.filter((s) => email[s.key]).length;
  return on === 0
    ? 'You won’t get any email from us except security and service notices.'
    : `${on} of ${EMAIL_SWITCHES.length} emails on.`;
}

/** "Turn off all email" is offered only while one is on (L2-064 AC3). */
export function offersTurnOffAllEmail(email: EmailPreferencesDto): boolean {
  return EMAIL_SWITCHES.some((s) => email[s.key]);
}

/** The draft with all four emails off (L2-064 AC3). */
export function turnOffAllEmail(values: PreferencesValuesDto): PreferencesValuesDto {
  return {
    ...values,
    email: { weekly: false, eventAlerts: false, trainingPlan: false, devotion: false },
  };
}

/** Whether what is on screen differs from what is saved (L2-064 AC5). */
export function preferencesDiffer(
  saved: PreferencesValuesDto,
  draft: PreferencesValuesDto,
): boolean {
  const interests = (values: PreferencesValuesDto) =>
    [...values.suggestions.interests].sort().join();
  return (
    EMAIL_SWITCHES.some((s) => saved.email[s.key] !== draft.email[s.key]) ||
    NOTIFICATION_SWITCHES.some((s) => saved.notifications[s.key] !== draft.notifications[s.key]) ||
    saved.privacy.visibility !== draft.privacy.visibility ||
    PRIVACY_SWITCHES.some((s) => saved.privacy[s.key] !== draft.privacy[s.key]) ||
    saved.suggestions.area !== draft.suggestions.area ||
    // The same interests in another order are no change.
    interests(saved) !== interests(draft)
  );
}

/** Where a save stands: nothing asked, under way, just kept, or failed. */
export type SavePhase = 'clean' | 'saving' | 'saved' | 'failed';

/** How long "Preferences saved" stays (L2-064 AC6). */
export const SAVED_MS = 2_000;

/** What the save bar reads; none hides it. */
export interface SaveBarView {
  text: string;
  /** The button's word; none while it says "Preferences saved". */
  action: string | null;
  busy: boolean;
  role: 'status' | 'alert';
  /** Just saved: drawn with its check mark. */
  done: boolean;
}

/** The save bar of a phase and whether the page has unsaved changes (L2-064 AC5 to AC7). */
export function saveBarOf(phase: SavePhase, dirty: boolean): SaveBarView | null {
  switch (phase) {
    case 'saving':
      return {
        text: 'Unsaved changes',
        action: 'Saving…',
        busy: true,
        role: 'status',
        done: false,
      };
    case 'saved':
      return { text: 'Preferences saved', action: null, busy: false, role: 'status', done: true };
    case 'failed':
      return {
        text: 'Couldn’t save. Your changes are still here.',
        action: 'Try again',
        busy: false,
        role: 'alert',
        done: false,
      };
    default:
      return dirty
        ? { text: 'Unsaved changes', action: 'Save', busy: false, role: 'status', done: false }
        : null;
  }
}

/** What a screen with a draft answers the leave guard: whether leaving would lose changes. */
export interface HoldsUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** The question asked before leaving a screen with unsaved changes (L2-064 AC5). */
export const UNSAVED_CHANGES_QUESTION = 'You have unsaved changes. Leave without saving?';

/**
 * Whether a screen may be left (L2-064 AC5): at once when nothing is unsaved, else only when the
 * member says so. `ask` is the browser's own confirmation, so no dialog code loads for it.
 */
export function mayLeave(screen: HoldsUnsavedChanges, ask: (question: string) => boolean): boolean {
  return !screen.hasUnsavedChanges() || ask(UNSAVED_CHANGES_QUESTION);
}
