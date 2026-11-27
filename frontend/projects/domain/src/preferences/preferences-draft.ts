import type {
  EmailPreferencesDto,
  NotificationPreferencesDto,
  PreferencesDto,
  PreferencesValuesDto,
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

/** The settings of what the API answers, without the member's name. */
export function valuesOf(preferences: PreferencesDto): PreferencesValuesDto {
  return {
    email: { ...preferences.email },
    notifications: { ...preferences.notifications },
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
  return (
    EMAIL_SWITCHES.some((s) => saved.email[s.key] !== draft.email[s.key]) ||
    NOTIFICATION_SWITCHES.some((s) => saved.notifications[s.key] !== draft.notifications[s.key])
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
