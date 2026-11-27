import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  DATA_SERVICE,
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
  InlineMessage,
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
import type { DeleteAccountDialog } from '../../dialogs/delete-account/delete-account-dialog';
import type { DialogRef } from '@angular/cdk/dialog';
import { HttpDataService } from '../../services/http-data.service';
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
    InlineMessage,
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
  providers: [
    { provide: PREFERENCES_SERVICE, useClass: HttpPreferencesService },
    { provide: DATA_SERVICE, useClass: HttpDataService },
  ],
  templateUrl: './preferences-page.html',
  styleUrl: './preferences-page.scss',
})
export default class PreferencesPage implements HoldsUnsavedChanges {
  private readonly api = inject(PREFERENCES_SERVICE);
  private readonly data = inject(DATA_SERVICE);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  /** The open Delete your account dialog, or true while it loads; one at a time. */
  private deleteDialog: DialogRef<boolean, DeleteAccountDialog> | true | null = null;
  private downloadRequest: Subscription | undefined;
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
    { id: 'account', title: 'Your data' },
  ];
  protected readonly downloadRequested = "Requested. We'll email you a link within 24 hours.";
  protected readonly skeletonSections = [0, 1];
  protected readonly skeletonRows = [0, 1, 2];

  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly name = signal('');
  /** The account's address, which the Delete your account dialog names. */
  private readonly accountEmail = signal('');
  private readonly saved = signal<PreferencesValuesDto | null>(null);
  protected readonly draft = signal<PreferencesValuesDto | null>(null);
  private readonly phase = signal<SavePhase>('clean');
  /**
   * Your data's download (L2-066 AC1, AC3): not asked, being asked, asked in the last 24 hours (the
   * confirmation stands in place of the button), or the request got no answer. It is no setting,
   * so it never waits for Save.
   */
  protected readonly download = signal<'ask' | 'asking' | 'asked' | 'failed'>('ask');

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
    this.destroyRef.onDestroy(() => {
      this.window?.removeEventListener('beforeunload', this.beforeUnload);
      this.request?.unsubscribe();
      this.downloadRequest?.unsubscribe();
      clearTimeout(this.savedTimer);
      if (this.deleteDialog && this.deleteDialog !== true) this.deleteDialog.close(false);
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
        this.accountEmail.set(preferences.accountEmail);
        this.saved.set(valuesOf(preferences));
        this.draft.set(valuesOf(preferences));
        this.download.set(preferences.downloadRequestedAt ? 'asked' : 'ask');
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

  /** Request download, or Try again after it got no answer (L2-066 AC1). */
  protected requestDownload(): void {
    if (this.download() === 'asking' || this.download() === 'asked') return;
    this.download.set('asking');
    this.downloadRequest?.unsubscribe();
    this.downloadRequest = this.data.requestDownload().subscribe({
      next: () => this.download.set('asked'),
      error: () => this.download.set('failed'),
    });
  }

  /**
   * Asks, in a dialog loaded on first use, whether to delete the account (L2-066 AC4, AC5; ADR
   * 0118); once it is deleting the member is signed out and lands on the front page.
   */
  protected async deleteAccount(): Promise<void> {
    if (this.deleteDialog) return;
    this.deleteDialog = true;
    const { openDeleteAccountDialog } =
      await import('../../dialogs/delete-account/delete-account-dialog');
    if (this.destroyRef.destroyed) return;
    const dialog = openDeleteAccountDialog(this.injector, {
      name: this.name(),
      email: this.accountEmail(),
    });
    this.deleteDialog = dialog;
    dialog.closed.subscribe((deleted) => {
      this.deleteDialog = null;
      if (!deleted) return;
      // The account is gone: nothing on the page is left to save.
      this.draft.set(this.saved());
      void this.router.navigateByUrl('/');
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
