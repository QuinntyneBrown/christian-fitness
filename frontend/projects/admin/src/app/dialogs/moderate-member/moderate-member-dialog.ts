import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_MEMBERS_SERVICE, type AdminMemberDto, type ModerationAction } from '@cf/api';
import {
  Alert,
  type AlertItem,
  Button,
  Checkbox,
  CheckboxGroup,
  Dialog as DialogShell,
  RadioGroup,
  type RadioOption,
  Textarea,
} from '@cf/components';
import {
  memberStatusLabel,
  MODERATION_NOTE_MAX,
  moderationActionsOf,
  moderationNeedsNote,
  type ModerationProblem,
  moderationProblems,
  moderationProblemsHeading,
  type ModerationRefusal,
  moderationRefusalMessage,
  moderationRefusalOf,
  moderationSubmitLabel,
  moderationTitle,
} from '@cf/domain';

/** The ids that name and describe the dialog. */
const HEADING_ID = 'moderate-member-title';
const DESCRIPTION_ID = 'moderate-member-desc';
const NOTE_ID = 'f-note';
const CONFIRMED_ID = 'f-confirmed';

/** What the dialog closes with after a change: what was done, and the member as they now are. */
export interface ModerationResult {
  action: ModerationAction;
  member: AdminMemberDto;
}

const OPTIONS: Record<ModerationAction, RadioOption> = {
  flag: {
    value: 'flag',
    label: 'Flag',
    description: 'Marks them for staff attention. They can still use the app.',
  },
  suspend: {
    value: 'suspend',
    label: 'Suspend',
    description: 'Signs them out everywhere. They cannot sign in until they are reinstated.',
  },
  reinstate: {
    value: 'reinstate',
    label: 'Reinstate',
    description: 'Returns them to Active and clears the note on their row.',
  },
};

const ACTIONS: readonly ModerationAction[] = ['flag', 'suspend', 'reinstate'];

/**
 * The moderation dialog (mock docs/mocks/dialogs/moderate-member/; L2-029 AC1, AC2, AC4, AC5, AC9;
 * ADR 0023, ADR 0024): a CDK Dialog rendering the library's dialog, which draws its own scrim and
 * panel, so the CDK adds no backdrop. Each status offers what it allows, the milder first: an
 * Active member can be flagged or suspended, a Flagged one reinstated or suspended, a Suspended
 * one only reinstated, and then the title says so and the dialog says what it means. A flag or a
 * suspension needs a note, and a suspension also its confirmation; reinstating needs neither: what is missing is named in an error summary that takes focus
 * and beside each field, and nothing is sent. While the change is on its way the fields hold
 * still and the dialog stays open. A change closes it with the member as they now are; a refusal
 * shows its own sentence by code and gives the fields back as typed.
 */
@Component({
  selector: 'cf-moderate-member-dialog',
  imports: [Alert, Button, Checkbox, CheckboxGroup, DialogShell, RadioGroup, Textarea],
  templateUrl: './moderate-member-dialog.html',
  styleUrl: './moderate-member-dialog.scss',
})
export class ModerateMemberDialog {
  private readonly members = inject(ADMIN_MEMBERS_SERVICE);
  private readonly ref = inject<DialogRef<ModerationResult, ModerateMemberDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly member = inject<AdminMemberDto>(DIALOG_DATA);
  private readonly allowed = moderationActionsOf(this.member.status);

  protected readonly headingId = HEADING_ID;
  protected readonly descriptionId = DESCRIPTION_ID;
  protected readonly noteId = NOTE_ID;
  protected readonly confirmedId = CONFIRMED_ID;
  protected readonly noteMax = MODERATION_NOTE_MAX;
  protected readonly heading = moderationTitle(this.member.name, this.member.status);
  protected readonly subtitle = `${this.member.email} · ${memberStatusLabel(this.member.status)}`;
  /** The choice of action; none when the status leaves only one. */
  protected readonly options: readonly RadioOption[] =
    this.allowed.length > 1 ? this.allowed.map((action) => OPTIONS[action]) : [];
  protected readonly confirmLabel = `Suspend ${this.member.name} and end their sessions`;
  /** What reinstating means, said when it is the only thing the status allows (mock `suspended`). */
  protected readonly reinstateHeading = `${this.member.name} will be able to sign in again`;

  protected readonly action = signal<ModerationAction>(this.allowed[0] ?? 'suspend');
  protected readonly note = signal('');
  protected readonly confirmed = signal(false);
  protected readonly saving = signal(false);
  /** What the last press of the button found missing; a field's own leaves when it is edited. */
  private readonly problems = signal<readonly ModerationProblem[]>([]);
  protected readonly refusal = signal<ModerationRefusal | null>(null);
  /** Counts the presses that found something missing, so each shows a new, focused summary. */
  protected readonly attempts = signal<readonly number[]>([]);

  /** The choices, which hold still while the change is on its way. */
  protected readonly shownOptions = computed<RadioOption[]>(() =>
    this.options.map((option) => ({ ...option, disabled: this.saving() })),
  );
  protected readonly needsNote = computed(() => moderationNeedsNote(this.action()));
  protected readonly submitLabel = computed(() => moderationSubmitLabel(this.action()));
  protected readonly summaryHeading = computed(() =>
    moderationProblemsHeading(this.problems().length),
  );
  protected readonly summaryItems = computed<AlertItem[]>(() =>
    this.problems().map(({ field, text }) => ({
      text,
      target: field === 'note' ? NOTE_ID : CONFIRMED_ID,
    })),
  );
  protected readonly noteError = computed(() => this.problemOf('note'));
  protected readonly confirmedError = computed(() => this.problemOf('confirmed'));
  protected readonly refusalMessage = computed(() => {
    const refusal = this.refusal();
    return refusal ? moderationRefusalMessage(refusal) : null;
  });

  /** A new choice starts clean: what the last press found missing belonged to the old one. */
  protected choose(value: string): void {
    const action = ACTIONS.find((known) => known === value);
    if (!action || !this.allowed.includes(action)) return;
    this.action.set(action);
    this.problems.set([]);
  }

  protected setNote(note: string): void {
    this.note.set(note);
    this.forget('note');
  }

  protected setConfirmed(confirmed: boolean): void {
    this.confirmed.set(confirmed);
    this.forget('confirmed');
  }

  protected close(): void {
    if (!this.saving()) this.ref.close();
  }

  protected submit(): void {
    if (this.saving()) return;
    const action = this.action();
    const note = this.note().trim();
    const problems = moderationProblems(action, note, this.confirmed(), this.member.name);
    this.refusal.set(null);
    this.problems.set(problems);
    if (problems.length > 0) {
      this.attempts.update(([last = 0]) => [last + 1]);
      return;
    }
    this.saving.set(true);
    // Escape, Close and the scrim wait for the answer, so it is never lost.
    this.ref.disableClose = true;
    const change =
      action === 'flag'
        ? this.members.flag(this.member.id, note)
        : action === 'suspend'
          ? this.members.suspend(this.member.id, note)
          : this.members.reinstate(this.member.id);
    change.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (member) => this.ref.close({ action, member }),
      error: (error: unknown) => {
        this.refusal.set(moderationRefusalOf(error));
        this.saving.set(false);
        this.ref.disableClose = false;
      },
    });
  }

  private problemOf(field: ModerationProblem['field']): string | null {
    return this.problems().find((problem) => problem.field === field)?.text ?? null;
  }

  private forget(field: ModerationProblem['field']): void {
    this.problems.update((problems) => problems.filter((problem) => problem.field !== field));
  }
}

/**
 * Opens the moderation dialog for `member`, with `injector` (the Members page's, which binds
 * {@link ADMIN_MEMBERS_SERVICE}); it closes with the change, or nothing. The Members page imports
 * this file on the first Moderate, so the dialog and its fields stay out of the page's chunk.
 */
export function openModerateMember(
  injector: Injector,
  member: AdminMemberDto,
): DialogRef<ModerationResult, ModerateMemberDialog> {
  return injector
    .get(Dialog)
    .open<ModerationResult, AdminMemberDto, ModerateMemberDialog>(ModerateMemberDialog, {
      injector,
      data: member,
      ariaLabelledBy: HEADING_ID,
      ariaDescribedBy: DESCRIPTION_ID,
      ariaModal: true,
      // The first choice when there is one to make; else the dialog itself, so its name and
      // description are read before the one button that acts.
      autoFocus: moderationActionsOf(member.status).length > 1 ? '#f-action-0' : 'dialog',
      restoreFocus: true,
      // The dialog draws its own scrim and panel, so the CDK adds no backdrop; its pane spans the
      // viewport the scrim covers and adds the dialog role, the focus trap, Escape and focus
      // return.
      hasBackdrop: false,
      width: '100%',
      maxWidth: '100%',
      height: '100%',
    });
}
