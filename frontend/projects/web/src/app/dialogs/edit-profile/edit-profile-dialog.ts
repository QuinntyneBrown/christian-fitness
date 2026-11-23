import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { INTERESTS, type InterestKey, type OwnProfileDto, PROFILE_SERVICE } from '@cf/api';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  FormLayout,
  Interest,
  InterestList,
  Textarea,
  TextField,
} from '@cf/components';
import {
  bioHintOf,
  clearProfileError,
  profileFormOf,
  profileRefusalOf,
  profileRequestOf,
  profileSummaryOf,
  toggleInterest,
  validateProfile,
  type ProfileField,
  type ProfileFieldErrors,
  type ProfileForm,
  type ProfileRefusal,
} from '@cf/domain';

/** What the dialog closes with: the profile as saved, or nothing when the member left. */
export type EditProfileResult = OwnProfileDto | null;

/**
 * The Edit profile dialog (L2-006; ADR 0024; mock `docs/mocks/dialogs/edit-profile/`), a CDK
 * Dialog that renders the library's `cf-dialog` shell around the library's form controls. It
 * opens with the current values, the home church hidden unless the member showed it (AC1, AC4).
 * Before sending, `validateProfile` names each field to fix and nothing is sent (AC6, mock
 * `invalid`, `invalid-limits`). While the save is on its way the button reads "Saving…", the fields
 * hold still and Cancel is disabled; Close, Escape and the scrim do nothing (mock `busy`). A
 * refusal or no answer keeps the dialog and every value with the mock's `refused` or `failed`
 * message (AC7). It closes with the profile as saved (AC2), or with nothing when the member leaves
 * without saving. It uses the `PROFILE_SERVICE` of the screen that opened it.
 */
@Component({
  selector: 'cf-edit-profile-dialog',
  imports: [
    Alert,
    Button,
    Checkbox,
    Dialog,
    FormLayout,
    Interest,
    InterestList,
    Textarea,
    TextField,
  ],
  templateUrl: './edit-profile-dialog.html',
  styleUrl: './edit-profile-dialog.scss',
})
export class EditProfileDialog {
  private readonly profiles = inject(PROFILE_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<EditProfileResult, EditProfileDialog> = inject(DialogRef);
  /** The profile as the API answered it: the starting values, read once. */
  private readonly profile: OwnProfileDto = inject(DIALOG_DATA);

  protected readonly options = INTERESTS;
  protected readonly form = signal<ProfileForm>(profileFormOf(this.profile));
  protected readonly saving = signal(false);
  protected readonly fieldErrors = signal<ProfileFieldErrors>({});
  protected readonly summary = computed(() => profileSummaryOf(this.fieldErrors()));
  /** What the last answer refused, until the next save. */
  protected readonly refusal = signal<ProfileRefusal | null>(null);
  protected readonly values = this.form.asReadonly();
  protected readonly bioHint = computed(() => bioHintOf(this.values().bio));

  constructor() {
    // The dialog opens with `disableClose`, so Escape is the screen's to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.dismiss();
    });
  }

  /** Keeps what the member typed in `field` and clears that field's error. */
  protected edit(field: ProfileField, value: string): void {
    this.form.update((form) => ({ ...form, [field]: value }));
    this.fieldErrors.update((errors) => clearProfileError(errors, field));
  }

  protected show(checked: boolean): void {
    this.form.update((form) => ({ ...form, showHomeChurch: checked }));
  }

  protected toggle(key: InterestKey): void {
    this.form.update((form) => ({ ...form, interests: toggleInterest(form.interests, key) }));
  }

  /** Leaves without saving, unless a save is on its way. */
  protected dismiss(): void {
    if (!this.saving()) this.ref.close(null);
  }

  protected save(event: Event): void {
    event.preventDefault();
    if (this.saving()) return;
    const form = this.values();
    const errors = validateProfile(form);
    this.fieldErrors.set(errors);
    this.refusal.set(null);
    if (Object.keys(errors).length > 0) return;
    this.saving.set(true);
    this.profiles
      .update(this.profile.memberId, profileRequestOf(form))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => this.ref.close(saved),
        // The dialog stays as it was, so the member can try again.
        error: (error: unknown) => {
          this.saving.set(false);
          this.refusal.set(profileRefusalOf(error));
        },
      });
  }
}

/**
 * Opens the Edit profile dialog for `profile` with the CDK Dialog (ADR 0024). `injector` is the
 * screen's, so the dialog uses the screen's `PROFILE_SERVICE`. The library's `cf-dialog` draws the
 * scrim, so there is no CDK backdrop; the CDK container is the `role="dialog"`, `aria-modal`
 * element named by the dialog's title, hides the rest of the page from assistive technology, traps
 * focus, starts it in Full name and returns it to the opener. Escape and the scrim go through the dialog's own `dismiss`, which ignores them while a
 * save is on its way.
 */
export function openEditProfileDialog(
  injector: Injector,
  profile: OwnProfileDto,
): DialogRef<EditProfileResult, EditProfileDialog> {
  return injector
    .get(CdkDialog)
    .open<EditProfileResult, OwnProfileDto, EditProfileDialog>(EditProfileDialog, {
      data: profile,
      injector,
      ariaLabelledBy: 'dlg-title',
      ariaModal: true,
      // The container covers the viewport, as the shell's scrim does, so the element named by the
      // title is where the dialog is; the shell places its own panel.
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      autoFocus: '#f-name',
      restoreFocus: true,
      hasBackdrop: false,
      disableClose: true,
    });
}
