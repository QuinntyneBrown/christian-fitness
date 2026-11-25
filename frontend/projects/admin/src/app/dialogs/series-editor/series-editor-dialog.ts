import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import {
  ADMIN_SERIES_SERVICE,
  type AdminSeriesDto,
  type ApiError,
  type EventCategory,
  type EventHostDto,
} from '@cf/api';
import {
  Alert,
  Button,
  Dialog as DialogShell,
  FileField,
  FormLayout,
  PickCards,
  Select,
  type SelectOption,
  Textarea,
  TextField,
} from '@cf/components';
import {
  EMPTY_SERIES_EDITOR,
  EVENT_CATEGORIES,
  eventCategoryLabel,
  eventErrorHeading,
  HOST_SEARCH_DELAY_MS,
  HOST_SEARCH_FAILED_TEXT,
  hostChoiceViewOf,
  type HostChoiceView,
  hostNoMatchesText,
  hostSearchTermOf,
  seriesDraftOf,
  seriesDraftProblemsOf,
  type SeriesEditorValues,
  seriesErrorItems,
  type SeriesFieldErrors,
  seriesFieldErrorsOf,
  type SeriesFieldKey,
} from '@cf/domain';

/** The ids that name and describe the dialog. */
const HEADING_ID = 'series-editor-title';
const DESCRIPTION_ID = 'series-editor-desc';

const CATEGORY_OPTIONS: readonly SelectOption[] = EVENT_CATEGORIES.map((category) => ({
  value: category,
  label: eventCategoryLabel(category),
}));

/** The image types the picker offers (L2-071 AC12). */
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

/** The editor's fields typed as text. */
type TextKey =
  'title' | 'description' | 'seriesPrice' | 'dropInPrice' | 'capacity' | 'location' | 'area';

/**
 * The series editor, "New series" (mock docs/mocks/dialogs/series-editor/, states `default`,
 * `searching`, `selected`, `no-results`, `invalid`, `busy` and `failed`; L2-071 AC10 to AC12,
 * AC15; ADR 0089, ADR 0091): a CDK Dialog rendering the library's dialog with Title, Category,
 * Host, Description, Image, Series price, Drop-in price, Capacity, Location and Suggestion area.
 * Focus starts on Title; the host starts as the team listing and is searched among Listed
 * listings. What must change is named in an error summary that takes focus before anything is
 * sent; while the series is on its way the button reads "Creating…", Cancel is disabled and the
 * fields hold still; a field the API refuses is named the same way, and any other failure says so
 * in an alert, keeping what was typed. A created series closes the dialog with it.
 */
@Component({
  selector: 'cf-series-editor-dialog',
  imports: [
    Alert,
    Button,
    DialogShell,
    FileField,
    FormLayout,
    PickCards,
    Select,
    Textarea,
    TextField,
  ],
  templateUrl: './series-editor-dialog.html',
  styleUrl: './series-editor-dialog.scss',
})
export class SeriesEditorDialog {
  private readonly series = inject(ADMIN_SERIES_SERVICE);
  private readonly ref = inject<DialogRef<AdminSeriesDto, SeriesEditorDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  /** The Host search waiting for the typing to stop, and the one on its way (ADR 0089). */
  private hostTimer: ReturnType<typeof setTimeout> | undefined;
  private hostSearch: Subscription | null = null;
  private hostMatches: readonly EventHostDto[] = [];

  protected readonly headingId = HEADING_ID;
  protected readonly descriptionId = DESCRIPTION_ID;
  protected readonly categories = CATEGORY_OPTIONS;
  protected readonly imageTypes = IMAGE_TYPES;
  protected readonly values = signal<SeriesEditorValues>(inject<SeriesEditorValues>(DIALOG_DATA));
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly failed = signal(false);
  protected readonly errors = signal<SeriesFieldErrors>({});
  protected readonly errorItems = computed(() => seriesErrorItems(this.errors()));
  protected readonly errorHeading = computed(() => eventErrorHeading(this.errorItems().length));
  /** Counts the summaries shown, so each is drawn anew and takes focus. */
  protected readonly round = signal(0);
  /** The matching hosts the picker offers, as pick cards. */
  protected readonly hostChoices = signal<readonly HostChoiceView[]>([]);
  /** The line under the Host field: no match, or a search that failed. */
  protected readonly hostStatus = signal('');

  constructor() {
    this.askDefaultHost();
    this.destroyRef.onDestroy(() => clearTimeout(this.hostTimer));
  }

  protected set(field: TextKey, value: string): void {
    this.values.update((values) => ({ ...values, [field]: value }));
    this.clearError(field);
  }

  protected setCategory(value: string): void {
    this.values.update((values) => ({ ...values, category: value as EventCategory }));
    this.clearError('category');
  }

  /**
   * The Host field's text (ADR 0089): any edit clears the choice; from 2 characters, the matches
   * are asked for once the typing stops, and a new edit drops a search still on its way.
   */
  protected searchHost(text: string): void {
    this.values.update((values) => ({ ...values, hostName: text, hostListingId: null }));
    this.clearError('host');
    clearTimeout(this.hostTimer);
    this.hostSearch?.unsubscribe();
    this.hostChoices.set([]);
    this.hostStatus.set('');
    const term = hostSearchTermOf(text);
    if (term === null) return;
    this.hostTimer = setTimeout(() => {
      this.hostSearch = this.series
        .searchHosts(term)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ hosts }) => {
            this.hostMatches = hosts;
            this.hostChoices.set(hosts.map(hostChoiceViewOf));
            if (hosts.length === 0) this.hostStatus.set(hostNoMatchesText(term));
          },
          error: () => this.hostStatus.set(HOST_SEARCH_FAILED_TEXT),
        });
    }, HOST_SEARCH_DELAY_MS);
  }

  /** Makes the chosen match the host, closes the list and returns to the field. */
  protected chooseHost(id: string): void {
    const host = this.hostMatches.find((match) => match.id === id);
    if (!host || this.saving()) return;
    this.values.update((values) => ({ ...values, hostListingId: host.id, hostName: host.name }));
    this.clearError('host');
    this.hostChoices.set([]);
    this.document.getElementById('f-host')?.focus();
  }

  /** The image field's file: uploaded at once, kept by its key until the series is saved. */
  protected chooseImage(file: File): void {
    this.uploading.set(true);
    this.clearError('image');
    this.series
      .uploadImage(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ imageKey }) => {
          this.values.update((values) => ({ ...values, imageKey, imageName: file.name }));
          this.uploading.set(false);
        },
        error: (error: ApiError) => {
          const image =
            seriesFieldErrorsOf(error)?.image ?? 'Use a JPEG, PNG or WebP image up to 5 MB';
          this.errors.update((errors) => ({ ...errors, image }));
          this.uploading.set(false);
        },
      });
  }

  protected removeImage(): void {
    this.values.update((values) => ({ ...values, imageKey: null, imageName: null }));
    this.clearError('image');
  }

  protected close(): void {
    if (this.saving()) return;
    this.ref.close();
  }

  /** Names what must change, else sends the series; a created series closes the dialog with it. */
  protected save(): void {
    if (this.saving() || this.uploading()) return;
    this.failed.set(false);
    this.errors.set({});
    const problems = seriesDraftProblemsOf(this.values());
    if (Object.keys(problems).length > 0) {
      this.showErrors(problems);
      return;
    }
    this.saving.set(true);
    this.ref.disableClose = true;
    this.series
      .create(seriesDraftOf(this.values()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => this.ref.close(created),
        error: (error: ApiError) => {
          const fields = seriesFieldErrorsOf(error);
          if (fields) this.showErrors(fields);
          else this.failed.set(true);
          this.saving.set(false);
          this.ref.disableClose = false;
        },
      });
  }

  /**
   * A new series' host starts as the team listing (ADR 0089), unless staff already typed in the
   * field; a failure leaves the field for them to search.
   */
  private askDefaultHost(): void {
    this.series
      .defaultHost()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (host) => {
          if (this.values().hostName !== '' || this.values().hostListingId !== null) return;
          this.values.update((values) => ({
            ...values,
            hostListingId: host.id,
            hostName: host.name,
          }));
        },
        error: () => undefined,
      });
  }

  /** Shows `errors` in a new summary, which takes focus, even when the last one still shows. */
  private showErrors(errors: SeriesFieldErrors): void {
    this.errors.set(errors);
    this.round.update((round) => round + 1);
  }

  private clearError(field: SeriesFieldKey): void {
    if (!this.errors()[field]) return;
    this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }
}

/**
 * Opens the series editor for a new series, with `injector` (the Event series page's, which binds
 * {@link ADMIN_SERIES_SERVICE}); it closes with the created series, or nothing. The page imports
 * this file on the first New series, so CDK Dialog stays out of every bundle until then.
 */
export function openSeriesEditor(
  injector: Injector,
): DialogRef<AdminSeriesDto, SeriesEditorDialog> {
  return injector
    .get(Dialog)
    .open<AdminSeriesDto, SeriesEditorValues, SeriesEditorDialog>(SeriesEditorDialog, {
      injector,
      data: EMPTY_SERIES_EDITOR,
      ariaLabelledBy: HEADING_ID,
      ariaDescribedBy: DESCRIPTION_ID,
      ariaModal: true,
      autoFocus: '#f-title',
      restoreFocus: true,
      // The library's dialog draws its own scrim and panel, so the CDK adds no backdrop.
      hasBackdrop: false,
      width: '100%',
      maxWidth: '100%',
      height: '100%',
    });
}
