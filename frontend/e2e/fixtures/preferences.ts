import type { ApiHandlers } from './api-handlers';

export interface PreferencesFixture {
  name: string;
  email: { weekly: boolean; eventAlerts: boolean; trainingPlan: boolean; devotion: boolean };
  notifications: {
    eventReminders: boolean;
    messages: boolean;
    followedListingDates: boolean;
    eventChanges: boolean;
  };
}

/** Grace's preferences as mock `preferences/default` draws them: three of four emails on. */
export const GRACE_PREFERENCES: PreferencesFixture = {
  name: 'Grace Thompson',
  email: { weekly: true, eventAlerts: true, trainingPlan: false, devotion: true },
  notifications: {
    eventReminders: true,
    messages: true,
    followedListingDates: true,
    eventChanges: true,
  },
};

/**
 * Answers `GET` and `PUT /api/preferences` as the API would: a save keeps what was sent and
 * answers it. Returns every body saved.
 */
export function answerPreferences(
  api: ApiHandlers,
  preferences: PreferencesFixture = GRACE_PREFERENCES,
): Omit<PreferencesFixture, 'name'>[] {
  const saves: Omit<PreferencesFixture, 'name'>[] = [];
  let current = preferences;
  api.on('GET', '/api/preferences', () => ({ json: current }));
  api.on('PUT', '/api/preferences', (request) => {
    const body = request.postDataJSON() as Omit<PreferencesFixture, 'name'>;
    saves.push(body);
    current = { ...current, ...body };
    return { json: current };
  });
  return saves;
}
