import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_DIRECTORY_SERVICE } from '@cf/api';
import { Alert, type AlertItem, Button, Dialog as DialogShell, Textarea } from '@cf/components';
import {
  reviewRefusalOf,
  SUGGESTION_DECLINE_HINT,
  SUGGESTION_DECLINE_REASON_MAX,
  suggestionDeclineFailure,
  suggestionDeclineProblem,
} from '@cf/domain';

/** The ids that name and describe the dialog. */
const HEADING_ID = 'decline-suggestion-title';
const DESCRIPTION_ID = 'decline-suggestion-desc';
const REASON_ID = 'f-reason';

/** The suggestion to decline: its id, its name and its kind and area, as the panel shows them. */
export interface DeclineSuggestionData {
  id: string;
  name: string;
  kindAndArea: string;
}

/**
 * What the dialog closes with: `declined` once staff declined it, or `stale` when it found the
 * suggestion already decided, so the page reads the list again. Closing otherwise gives nothing.
 */
export type DeclineSuggestionResult = 'declined' | 'stale';

/**
 * The decline dialog (mock docs/mocks/dialogs/decline-suggestion/; L2-073 AC8; ADR 0090): a CDK
 * Dialog rendering the library's dialog. The reason is optional; one over 500 characters is named
 * in an error summary and beside the field, and nothing is sent. While the decline is on its way
 * the field holds still and the dialog stays open. A decline closes it; a refusal shows its own
 * sentence by code and keeps the reason.
 */
@Component({
  selector: 'cf-decline-suggestion-dialog',
  imports: [Alert, Button, DialogShell, Textarea],
  templateUrl: './decline-suggestion-dialog.html',
  styleUrl: './decline-suggestion-dialog.scss',
})
export class DeclineSuggestionDialog {
  private readonly directory = inject(ADMIN_DIRECTORY_SERVICE);
  private readonly ref =
    inject<DialogRef<DeclineSuggestionResult, DeclineSuggestionDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly suggestion = inject<DeclineSuggestionData>(DIALOG_DATA);

  protected readonly headingId = HEADING_ID;
  protected readonly descriptionId = DESCRIPTION_ID;
  protected readonly reasonId = REASON_ID;
  protected readonly reasonMax = SUGGESTION_DECLINE_REASON_MAX;
  protected readonly reasonHint = SUGGESTION_DECLINE_HINT;
  protected readonly heading = `Decline ${this.suggestion.name}`;
  protected readonly subtitle = this.suggestion.kindAndArea;
  protected readonly summaryHeading = '1 thing to fix';

  protected readonly reason = signal('');
  protected readonly saving = signal(false);
  private readonly problem = signal<string | null>(null);
  private readonly refusal = signal<'decided' | 'failed' | null>(null);
  /** Counts the presses that found the reason too long, so each shows a new, focused summary. */
  protected readonly attempts = signal<readonly number[]>([]);

  protected readonly reasonError = computed(() => this.problem());
  protected readonly summaryItems = computed<AlertItem[]>(() => {
    const text = this.problem();
    return text ? [{ text, target: REASON_ID }] : [];
  });
  protected readonly failureMessage = computed(() => {
    const refusal = this.refusal();
    return refusal ? suggestionDeclineFailure(refusal) : null;
  });

  protected setReason(reason: string): void {
    this.reason.set(reason);
    this.problem.set(null);
  }

  protected close(): void {
    if (this.saving()) return;
    this.ref.close(this.refusal() === 'decided' ? 'stale' : undefined);
  }

  protected submit(): void {
    if (this.saving()) return;
    const reason = this.reason().trim();
    const problem = suggestionDeclineProblem(reason);
    this.refusal.set(null);
    this.problem.set(problem);
    if (problem) {
      this.attempts.update(([last = 0]) => [last + 1]);
      return;
    }
    this.saving.set(true);
    // Escape, Close and the scrim wait for the answer, so it is never lost.
    this.ref.disableClose = true;
    this.directory
      .decline(this.suggestion.id, reason === '' ? null : reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.ref.close('declined'),
        error: (error: unknown) => {
          this.refusal.set(reviewRefusalOf(error));
          this.saving.set(false);
          this.ref.disableClose = false;
        },
      });
  }
}

/**
 * Opens the decline dialog for `suggestion`, with `injector` (the Listings page's, which binds
 * {@link ADMIN_DIRECTORY_SERVICE}); it closes with the result, or nothing. The page imports this
 * file on the first Decline, so the dialog and its field stay out of the page's chunk.
 */
export function openDeclineSuggestion(
  injector: Injector,
  suggestion: DeclineSuggestionData,
): DialogRef<DeclineSuggestionResult, DeclineSuggestionDialog> {
  return injector
    .get(Dialog)
    .open<DeclineSuggestionResult, DeclineSuggestionData, DeclineSuggestionDialog>(
      DeclineSuggestionDialog,
      {
        injector,
        data: suggestion,
        ariaLabelledBy: HEADING_ID,
        ariaDescribedBy: DESCRIPTION_ID,
        ariaModal: true,
        autoFocus: `#${REASON_ID}`,
        restoreFocus: true,
        // The dialog draws its own scrim and panel, so the CDK adds no backdrop.
        hasBackdrop: false,
        width: '100%',
        maxWidth: '100%',
        height: '100%',
      },
    );
}

// Re-exported so the Listings page imports both of its dialogs from one lazy module: each separate
// dynamic import in a page grows the initial bundle (slice 23.2; docs/lessons-learned.md).
export { openDirectoryListingEditor } from '../directory-listing-editor/directory-listing-editor-dialog';
