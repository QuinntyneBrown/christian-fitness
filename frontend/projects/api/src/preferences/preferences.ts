import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** The Abundant Weekly and its three extras, as the account's own address is subscribed (L2-064 AC2). */
export interface EmailPreferencesDto {
  weekly: boolean;
  eventAlerts: boolean;
  trainingPlan: boolean;
  devotion: boolean;
}

/** The four notification switches (L2-064 AC4). */
export interface NotificationPreferencesDto {
  eventReminders: boolean;
  messages: boolean;
  followedListingDates: boolean;
  eventChanges: boolean;
}

/** Who can open the member's profile (L2-065 AC1): Members for a new member. */
export type ProfileVisibilityName = 'anyone' | 'members' | 'groups';

/** Who sees the member and who may message them (L2-065 AC1, AC4, AC5, AC10). */
export interface PrivacyPreferencesDto {
  visibility: ProfileVisibilityName;
  showHomeChurch: boolean;
  showOnAttendeeLists: boolean;
  letAnyoneMessage: boolean;
}

/** What orders Home's suggestions (L2-065 AC6, AC7): the member's area, or none, and the profile's interests. */
export interface SuggestionPreferencesDto {
  area: string | null;
  interests: string[];
}

/** What Preferences saves: every setting on the page, together (L2-064 AC6). */
export interface PreferencesValuesDto {
  email: EmailPreferencesDto;
  notifications: NotificationPreferencesDto;
  privacy: PrivacyPreferencesDto;
  suggestions: SuggestionPreferencesDto;
}

/**
 * `GET /api/preferences`: the member's name, the account's email (which the Delete your account
 * dialog names, ADR 0118) and their settings, and when they asked for their data while that is
 * within the last 24 hours (L2-066 AC3), else `null`.
 */
export interface PreferencesDto extends PreferencesValuesDto {
  name: string;
  accountEmail: string;
  downloadRequestedAt: string | null;
}

/**
 * The signed-in member's preferences (`/api/preferences`; L2-064). `save` keeps every setting sent
 * together and answers them as saved. A refusal (`validation_failed` with `fieldCodes` for a
 * visibility, an area or an interest off its list) or no answer errors with an `ApiError`.
 */
export interface PreferencesApi {
  get(): Observable<PreferencesDto>;
  save(values: PreferencesValuesDto): Observable<PreferencesDto>;
}

/** Binds {@link PreferencesApi}; the Preferences page provides it on its own route component. */
export const PREFERENCES_SERVICE = new InjectionToken<PreferencesApi>('PREFERENCES_SERVICE');
