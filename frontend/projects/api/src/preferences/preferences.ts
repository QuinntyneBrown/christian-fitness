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

/** What Preferences saves: every setting on the page, together (L2-064 AC6). */
export interface PreferencesValuesDto {
  email: EmailPreferencesDto;
  notifications: NotificationPreferencesDto;
}

/** `GET /api/preferences`: the member's name and their settings. */
export interface PreferencesDto extends PreferencesValuesDto {
  name: string;
}

/**
 * The signed-in member's preferences (`/api/preferences`; L2-064). `save` keeps every setting sent
 * together and answers them as saved. A refusal or no answer errors with an `ApiError`.
 */
export interface PreferencesApi {
  get(): Observable<PreferencesDto>;
  save(values: PreferencesValuesDto): Observable<PreferencesDto>;
}

/** Binds {@link PreferencesApi}; the Preferences page provides it on its own route component. */
export const PREFERENCES_SERVICE = new InjectionToken<PreferencesApi>('PREFERENCES_SERVICE');
