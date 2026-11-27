import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import {
  type EmailPreferencesDto,
  type InterestKey,
  INTERESTS,
  type NotificationPreferencesDto,
  PREFERENCES_SERVICE,
  type PreferencesValuesDto,
  type PrivacyPreferencesDto,
  type ProfileVisibilityName,
} from '@cf/api';
import {
  Button,
  Container,
  EmptyState,
  Interest,
  InterestList,
  Link,
  PreferenceRow,
  PreferenceSection,
  RadioGroup,
  SaveBar,
  Select,
  SideNavigation,
  Skeleton,
  SkeletonRegion,
  Switch,
} from '@cf/components';
import {
  EMAIL_SWITCHES,
  emailSummary,
  type HoldsUnsavedChanges,
  NOTIFICATION_SWITCHES,
  offersTurnOffAllEmail,
  preferencesDiffer,
  PRIVACY_SWITCHES,
  saveBarOf,
  SAVED_MS,
  type SavePhase,
  SUGGESTION_AREAS,
  toggleInterest,
  turnOffAllEmail,
  valuesOf,
  VISIBILITY_OPTIONS,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpPreferencesService } from '../../services/http-preferences.service';

/**
 * Preferences (mock docs/mocks/pages/preferences/; L2-064): the member's name, a list of the
 * sections that stays in view at LG and wider, and Email and Notifications with a switch for each
 * setting. Nothing is saved until Save on the bar at the bottom, which keeps every change on the
 * page together; leaving with unsaved changes asks first. While it loads, skeleton rows and no
 * switch; when it does not, Try again and the way back to the profile. Its service is this screen's
 * own (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-preferences-page',
  imports: [
    Button,
    Container,
    EmptyState,
    Interest,
    InterestList,
    Link,
    PreferenceRow,
    PreferenceSection,
    RadioGroup,
    SaveBar,
    Select,
    SideNavigation,
    Skeleton,
    SkeletonRegion,
    Switch,
  ],
  providers: [{ provide: PREFERENCES_SERVICE, useClass: HttpPreferencesService }],
  templateUrl: './preferences-page.html',
  styleUrl: './preferences-page.scss',
})
export default class PreferencesPage implements HoldsUnsavedChanges {
  private readonly api = inject(PREFERENCES_SERVICE);
  private readonly window = inject(DOCUMENT).defaultView;
  private request: Subscription | undefined;
  private savedTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly emailSwitches = EMAIL_SWITCHES;
  protected readonly notificationSwitches = NOTIFICATION_SWITCHES;
  protected readonly privacySwitches = PRIVACY_SWITCHES;
  protected readonly visibilityOptions = VISIBILITY_OPTIONS;
  protected readonly areaOptions = SUGGESTION_AREAS;
  protected readonly interestOptions = INTERESTS;
  protected readonly sections = [
    { id: 'email', title: 'Email' },
    { id: 'notifications', title: 'Notifications' },
    { id: 'privacy', title: 'Privacy' },
    { id: 'suggestions', title: 'Suggestions' },
  ];
  protected readonly skeletonSections = [0, 1];
  protected readonly skeletonRows = [0, 1, 2];

  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly name = signal('');
  private readonly saved = signal<PreferencesValuesDto | null>(null);
  protected readonly draft = signal<PreferencesValuesDto | null>(null);
  private readonly phase = signal<SavePhase>('clean');

  private readonly dirty = computed(() => {
    const saved = this.saved();
    const draft = this.draft();
    return saved !== null && draft !== null && preferencesDiffer(saved, draft);
  });
  protected readonly bar = computed(() => saveBarOf(this.phase(), this.dirty()));
  /** While a save is under way every setting is read-only (L2-064 AC6). */
  protected readonly locked = computed(() => this.phase() === 'saving');
  protected readonly subtitle = computed(() => {
    const name = this.name();
    return `What we send you, what other members see, and what we suggest.${name ? ` Signed in as ${name}.` : ''}`;
  });
  protected readonly emailSummary = computed(() => {
    const draft = this.draft();
    return draft ? emailSummary(draft.email) : '';
  });
  protected readonly offersTurnOff = computed(() => {
    const draft = this.draft();
    return draft !== null && offersTurnOffAllEmail(draft.email);
  });

  /** Asks the browser before a reload or a closed tab loses changes. */
  private readonly beforeUnload = (event: BeforeUnloadEvent): void => {
    if (this.dirty()) event.preventDefault();
  };

  constructor() {
    this.window?.addEventListener('beforeunload', this.beforeUnload);
    inject(DestroyRef).onDestroy(() => {
      this.window?.removeEventListener('beforeunload', this.beforeUnload);
      this.request?.unsubscribe();
      clearTimeout(this.savedTimer);
    });
    this.load();
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.api.get().subscribe({
      next: (preferences) => {
        this.name.set(preferences.name);
        this.saved.set(valuesOf(preferences));
        this.draft.set(valuesOf(preferences));
        this.state.set('loaded');
      },
      error: () => this.state.set('failed'),
    });
  }

  protected setEmail(key: keyof EmailPreferencesDto, on: boolean): void {
    this.edit((draft) => ({ ...draft, email: { ...draft.email, [key]: on } }));
  }

  protected setNotification(key: keyof NotificationPreferencesDto, on: boolean): void {
    this.edit((draft) => ({ ...draft, notifications: { ...draft.notifications, [key]: on } }));
  }

  protected setVisibility(visibility: string): void {
    this.edit((draft) => ({
      ...draft,
      privacy: { ...draft.privacy, visibility: visibility as ProfileVisibilityName },
    }));
  }

  protected setPrivacy(key: Exclude<keyof PrivacyPreferencesDto, 'visibility'>, on: boolean): void {
    this.edit((draft) => ({ ...draft, privacy: { ...draft.privacy, [key]: on } }));
  }

  /** The member's area, or none for the prompt. */
  protected setArea(area: string): void {
    this.edit((draft) => ({ ...draft, suggestions: { ...draft.suggestions, area: area || null } }));
  }

  protected pressInterest(key: InterestKey): void {
    this.edit((draft) => ({
      ...draft,
      suggestions: {
        ...draft.suggestions,
        interests: toggleInterest(draft.suggestions.interests as InterestKey[], key),
      },
    }));
  }

  protected turnOffAllEmail(): void {
    this.edit(turnOffAllEmail);
  }

  /** Save, or Try again after a failure: every changed setting together (L2-064 AC6, AC7). */
  protected save(): void {
    const draft = this.draft();
    if (!draft || this.phase() === 'saving') return;
    clearTimeout(this.savedTimer);
    this.phase.set('saving');
    this.request = this.api.save(draft).subscribe({
      next: (preferences) => {
        this.saved.set(valuesOf(preferences));
        this.draft.set(valuesOf(preferences));
        this.phase.set('saved');
        this.savedTimer = setTimeout(() => this.phase.set('clean'), SAVED_MS);
      },
      error: () => this.phase.set('failed'),
    });
  }

  private edit(change: (draft: PreferencesValuesDto) => PreferencesValuesDto): void {
    const draft = this.draft();
    if (!draft || this.locked()) return;
    clearTimeout(this.savedTimer);
    this.draft.set(change(draft));
    this.phase.set('clean');
  }
}
