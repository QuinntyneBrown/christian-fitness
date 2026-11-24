import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ADMIN_SERVICES_SERVICE,
  type AdminListingDto,
  type AdminListingsDto,
  type PendingApplicationsDto,
  TOASTS_SERVICE,
} from '@cf/api';
import {
  Alert,
  Avatar,
  Button,
  EmptyState,
  Skeleton,
  SkeletonRegion,
  Table,
  type TableColumn,
  type TableRow,
  type ToastData,
  ToastRegion,
} from '@cf/components';
import {
  applicationSent,
  approvalFailure,
  decisionRefusalOf,
  listingVerifiedMonth,
  ToastStore,
} from '@cf/domain';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpAdminServicesService } from '../../services/http-admin-services.service';

/** What the page shows: skeletons, the queue and the live listings (empty or not), or the error state. */
type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; queue: PendingApplicationsDto; listings: AdminListingsDto; now: Date }
  | { kind: 'failed' };

/** The live listings table (mock `admin-services/default`); the Edit action is its last column. */
const LISTING_COLUMNS: readonly TableColumn[] = [
  { key: 'professional', label: 'Professional', kind: 'person' },
  { key: 'category', label: 'Category', kind: 'text' },
  { key: 'rate', label: 'Rate', kind: 'nowrap' },
  { key: 'verified', label: 'Verified', kind: 'nowrap' },
];

/** The rows the loading state draws (mock `admin-services/loading`). */
const SKELETON_ROWS = 5;

/** Where a card stands: its decision is on its way, or it was approved or declined. */
type Decision = 'deciding' | 'approved' | 'declined';

/** The cards the loading state draws (mock `admin-services/loading`). */
const SKELETON_CARDS = [0, 1, 2];

/**
 * Manage Services (mock docs/mocks/pages/admin-services/; L2-025 AC1 and AC4; ADR 0000). The
 * Applications section lists each pending application oldest first with the applicant's name, when
 * it was sent, the role and the credentials, or says nothing is waiting. While it loads, skeleton
 * cards; when it does not load, the error state with Try again. It holds one answer of at most 50
 * applications and nothing else about an applicant, all as text. Each card offers Approve and
 * Decline (L2-025 AC2, AC3; slice 21.2; ADR 0050): Approve decides at once, Decline opens a
 * dialog for the reason, imported on the first Decline. A decided card stays, saying how it was
 * decided, and the count falls; a decision that fails says so above the list, and one that was
 * decided already shows the queue as it is. The Live listings section (L2-027 AC1; slice 23.1; ADR
 * 0055) lists at most 50 live listings with Edit on each, which opens the listing editor, imported on
 * the first Edit; a saved change says so in a toast and the list reloads with its rows kept. Remove
 * (slice 23.2; ADR 0056) opens a confirmation, imported on the first Remove, and a removed listing
 * leaves the list the same way. Its
 * service is this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-manage-services-page',
  imports: [Alert, Avatar, Button, EmptyState, Skeleton, SkeletonRegion, Table, ToastRegion],
  templateUrl: './manage-services-page.html',
  styleUrl: './manage-services-page.scss',
  providers: [
    { provide: ADMIN_SERVICES_SERVICE, useClass: HttpAdminServicesService },
    { provide: TOASTS_SERVICE, useClass: ToastStore },
  ],
})
export default class ManageServicesPage {
  private readonly services = inject(ADMIN_SERVICES_SERVICE);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly toasts = inject(TOASTS_SERVICE);
  private readonly reload = new Subject<void>();
  private dialogOpen = false;

  protected readonly skeletonCards = SKELETON_CARDS;
  protected readonly listingColumns = LISTING_COLUMNS;
  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly state = signal<PageState>({ kind: 'loading' });

  /** What staff did to each card since the queue loaded, by application id. */
  private readonly decisions = signal<Readonly<Record<string, Decision>>>({});
  /** The alert above the list when a decision did not go through. */
  protected readonly failure = signal<{ heading: string; text: string } | null>(null);

  protected readonly cards = computed(() => {
    const state = this.state();
    if (state.kind !== 'ready') return [];
    const decisions = this.decisions();
    return state.queue.applications.map((application) => ({
      ...application,
      sent: applicationSent(application.submittedAt, state.now),
      decision: decisions[application.id],
    }));
  });
  protected readonly listingRows = computed<TableRow[]>(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.listings.listings.map(listingRowOf) : [];
  });
  protected readonly listingTotal = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.listings.total : 0;
  });
  protected readonly toastViews = computed<ToastData[]>(() =>
    this.toasts.toasts().map(({ id, title, text }) => ({
      id: String(id),
      tone: 'info',
      heading: title,
      text,
    })),
  );
  /** How many still wait: those the queue holds less those decided here. */
  protected readonly total = computed(() => {
    const state = this.state();
    if (state.kind !== 'ready') return 0;
    const decided = Object.values(this.decisions()).filter(
      (decision) => decision !== 'deciding',
    ).length;
    return Math.max(state.queue.total - decided, 0);
  });

  constructor() {
    this.reload
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.state.set({ kind: 'loading' });
          this.decisions.set({});
          return combineLatest({
            queue: this.services.applications(),
            listings: this.services.listings(),
          }).pipe(
            map(
              ({ queue, listings }) =>
                ({ kind: 'ready', queue, listings, now: new Date() }) satisfies PageState,
            ),
            catchError(() => of({ kind: 'failed' } satisfies PageState)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.state.set(state));
  }

  protected tryAgain(): void {
    this.failure.set(null);
    this.reload.next();
  }

  /** Approves the application `id`; the card says it is listed, or the alert says why not. */
  protected approve(id: string): void {
    const card = this.cards().find((shown) => shown.id === id);
    if (!card || card.decision === 'deciding') return;
    this.failure.set(null);
    this.decide(id, 'deciding');
    this.services
      .approve(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.decided(id, 'approved'),
        error: (error: unknown) => {
          this.undecide(id);
          const refusal = decisionRefusalOf(error);
          this.failure.set(approvalFailure(refusal, card.name));
          if (refusal === 'decided') this.reload.next();
        },
      });
  }

  /**
   * Opens the decline dialog for the application `id` (L2-025 AC3; ADR 0050), imported on the
   * first Decline. A decline marks the card; an application found already decided shows the
   * queue as it is now.
   */
  protected async decline(id: string): Promise<void> {
    const state = this.state();
    const application =
      state.kind === 'ready'
        ? state.queue.applications.find((shown) => shown.id === id)
        : undefined;
    if (!application || this.dialogOpen) return;
    this.dialogOpen = true;
    this.failure.set(null);
    const { openDeclineApplication } =
      await import('../../dialogs/decline-application/decline-application-dialog');
    if (this.destroyRef.destroyed) return;
    openDeclineApplication(this.injector, application)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.dialogOpen = false;
        if (result === 'declined') this.decided(id, 'declined');
        if (result === 'stale') this.reload.next();
      });
  }

  protected dismissToast(id: string): void {
    this.toasts.dismiss(Number(id));
  }

  /**
   * Opens the listing editor on the listing `id` (L2-027 AC1; ADR 0055), imported on the first Edit.
   * A saved change says so in a toast and shows the list as the API now holds it; a listing found
   * gone says so and does the same.
   */
  protected async editListing(id: string): Promise<void> {
    const state = this.state();
    const listing =
      state.kind === 'ready' ? state.listings.listings.find((shown) => shown.id === id) : undefined;
    if (!listing || this.dialogOpen) return;
    this.dialogOpen = true;
    const { openListingEditor } =
      await import('../../dialogs/listing-editor/listing-editor-dialog');
    if (this.destroyRef.destroyed) return;
    openListingEditor(this.injector, listing)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.dialogOpen = false;
        if (!result) return;
        if ('saved' in result) {
          this.toasts.show('Changes saved', `${result.saved.name} is updated.`);
        } else {
          this.toasts.show(
            "That listing isn't there any more",
            'Someone removed it. The list shows what is left.',
          );
        }
        this.refreshListings();
      });
  }

  /**
   * Opens the Remove listing confirmation on the listing `id` (L2-027 AC2; ADR 0056), imported on
   * the first Remove. A removal says so in a toast and the list shows what is left; a listing found
   * gone says so and does the same. Keeping it changes nothing.
   */
  protected async removeListing(id: string): Promise<void> {
    const state = this.state();
    const listing =
      state.kind === 'ready' ? state.listings.listings.find((shown) => shown.id === id) : undefined;
    if (!listing || this.dialogOpen) return;
    this.dialogOpen = true;
    const { openRemoveListing } =
      await import('../../dialogs/listing-editor/listing-editor-dialog');
    if (this.destroyRef.destroyed) return;
    openRemoveListing(this.injector, listing)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.dialogOpen = false;
        if (!result) return;
        if (result === 'removed') {
          this.toasts.show(
            'Listing removed',
            `${listing.name} is no longer on Services. Their conversations stay.`,
          );
        } else {
          this.toasts.show(
            "That listing isn't there any more",
            'Someone removed it. The list shows what is left.',
          );
        }
        this.refreshListings();
      });
  }

  /** Reads the live listings again, keeping the rows on screen meanwhile so focus stays put. */
  private refreshListings(): void {
    this.services
      .listings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (listings) =>
          this.state.update((state) => (state.kind === 'ready' ? { ...state, listings } : state)),
        error: () => this.reload.next(),
      });
  }

  private decide(id: string, decision: Decision): void {
    this.decisions.update((decisions) => ({ ...decisions, [id]: decision }));
  }

  private undecide(id: string): void {
    this.decisions.update((decisions) =>
      Object.fromEntries(Object.entries(decisions).filter(([key]) => key !== id)),
    );
  }

  /** Marks the card, and moves focus to what replaced its buttons so a keyboard user is not lost. */
  private decided(id: string, decision: 'approved' | 'declined'): void {
    this.decide(id, decision);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>(`#decision-${id}`)?.focus(),
      { injector: this.injector },
    );
  }
}

function listingRowOf(listing: AdminListingDto): TableRow {
  return {
    id: listing.id,
    name: listing.name,
    cells: {
      professional: { text: listing.name, sub: listing.role },
      category: { text: listing.category },
      rate: { text: listing.price },
      verified: { text: listingVerifiedMonth(listing.publishedAt) },
    },
  };
}
