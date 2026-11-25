import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_SERIES_SERVICE, type AdminSeriesDto, type ApiError } from '@cf/api';
import { Alert, Button, Dialog as DialogShell, FormLayout, TextField } from '@cf/components';
import {
  addSessionSubtitleOf,
  sessionDraftOf,
  sessionDraftProblemsOf,
  type SessionEditorValues,
  sessionEditorValuesOf,
  sessionErrorHeading,
  sessionErrorItems,
  type SessionFieldErrors,
  sessionFieldErrorsOf,
  type SessionFieldKey,
} from '@cf/domain';

/** The ids that name and describe the dialog. */
const HEADING_ID = 'add-session-title';
const DESCRIPTION_ID = 'add-session-desc';

/** What Add a date opens with: the series it adds to. */
export interface AddSessionData {
  series: AdminSeriesDto;
}

/** What Add a date closes with: the series as it now is, and the date added. */
export interface SessionAdded {
  series: AdminSeriesDto;
  date: string;
}

/**
 * Add a date (mock docs/mocks/dialogs/add-session/, states `default`, `invalid`, `busy` and
 * `failed`; L2-071 AC14; ADR 0091): a CDK Dialog rendering the library's dialog with Date, Start
 * time, End time and an optional Topic, opening on the week after the series' last date at its
 * times. A start not after now or an end not after the start is named in an error summary that
 * takes focus before anything is sent; while the date is on its way the button reads "Adding…",
 * Cancel is disabled and the fields hold still; a field the API refuses is named the same way, and
 * any other failure says so in an alert, keeping what was typed.
 */
@Component({
  selector: 'cf-add-session-dialog',
  imports: [Alert, Button, DialogShell, FormLayout, TextField],
  templateUrl: './add-session-dialog.html',
  styleUrl: './add-session-dialog.scss',
})
export class AddSessionDialog {
  private readonly api = inject(ADMIN_SERIES_SERVICE);
  private readonly ref = inject<DialogRef<SessionAdded, AddSessionDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly series = inject<AddSessionData>(DIALOG_DATA).series;

  protected readonly headingId = HEADING_ID;
  protected readonly descriptionId = DESCRIPTION_ID;
  protected readonly subtitle = addSessionSubtitleOf(this.series);
  protected readonly values = signal<SessionEditorValues>(sessionEditorValuesOf(this.series));
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly errors = signal<SessionFieldErrors>({});
  protected readonly errorItems = computed(() => sessionErrorItems(this.errors()));
  protected readonly errorHeading = computed(() => sessionErrorHeading(this.errorItems().length));
  /** Counts the summaries shown, so each is drawn anew and takes focus. */
  protected readonly round = signal(0);

  protected set(field: SessionFieldKey, value: string): void {
    this.values.update((values) => ({ ...values, [field]: value }));
    if (this.errors()[field]) this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }

  protected close(): void {
    if (this.saving()) return;
    this.ref.close();
  }

  /** Names what must change, else sends the date; an added date closes the dialog. */
  protected add(): void {
    if (this.saving()) return;
    this.failed.set(false);
    this.errors.set({});
    const values = this.values();
    const problems = sessionDraftProblemsOf(values, new Date());
    if (Object.keys(problems).length > 0) {
      this.showErrors(problems);
      return;
    }
    this.saving.set(true);
    this.ref.disableClose = true;
    this.api
      .addSession(this.series.id, sessionDraftOf(values))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (series) => this.ref.close({ series, date: values.date }),
        error: (error: ApiError) => {
          const fields = sessionFieldErrorsOf(error, values);
          if (fields) this.showErrors(fields);
          else this.failed.set(true);
          this.saving.set(false);
          this.ref.disableClose = false;
        },
      });
  }

  private showErrors(errors: SessionFieldErrors): void {
    this.errors.set(errors);
    this.round.update((round) => round + 1);
  }
}

/**
 * Opens Add a date on `series`, with `injector` (the Event series page's, which binds
 * {@link ADMIN_SERIES_SERVICE}); it closes with the date added, or nothing. The page imports this
 * file on the first Add a date, so it stays out of every bundle until then.
 */
export function openAddSession(
  injector: Injector,
  series: AdminSeriesDto,
): DialogRef<SessionAdded, AddSessionDialog> {
  return injector
    .get(Dialog)
    .open<SessionAdded, AddSessionData, AddSessionDialog>(AddSessionDialog, {
      injector,
      data: { series },
      ariaLabelledBy: HEADING_ID,
      ariaDescribedBy: DESCRIPTION_ID,
      ariaModal: true,
      autoFocus: '#f-date',
      restoreFocus: true,
      // The library's dialog draws its own scrim and panel, so the CDK adds no backdrop.
      hasBackdrop: false,
      width: '100%',
      maxWidth: '100%',
      height: '100%',
    });
}
