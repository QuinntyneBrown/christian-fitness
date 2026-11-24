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
import { ADMIN_SERVICES_SERVICE, type PendingApplicationsDto } from '@cf/api';
import { Alert, Avatar, Button, EmptyState, Skeleton, SkeletonRegion } from '@cf/components';
import { applicationSent, approvalFailure, decisionRefusalOf } from '@cf/domain';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpAdminServicesService } from '../../services/http-admin-services.service';

/** What the page shows: skeleton cards, the queue (empty or not), or the error state. */
type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; queue: PendingApplicationsDto; now: Date }
  | { kind: 'failed' };

/** Where a card stands: its decision is on its way, or it was approved or declined. */
type Decision = 'deciding' | 'approved' | 'declined';

/** The cards the loading state draws (mock `admin-services/loading`). */
const SKELETON_CARDS = [0, 1, 2];

/**
 * Manage Services (mock docs/mocks/pages/admin-services/; L2-025 AC1 and AC4; ADR 0048). The
 * Applications section lists each pending application oldest first with the applicant's name, when
 * it was sent, the role and the credentials, or says nothing is waiting. While it loads, skeleton
 * cards; when it does not load, the error state with Try again. It holds one answer of at most 50
 * applications and nothing else about an applicant, all as text. Each card offers Approve and
 * Decline (L2-025 AC2, AC3; slice 21.2; ADR 0049): Approve decides at once, Decline opens a
 * dialog for the reason, imported on the first Decline. A decided card stays, saying how it was
 * decided, and the count falls; a decision that fails says so above the list, and one that was
 * decided already shows the queue as it is. The live listings (slice 23) are not here yet. Its
 * service is this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-manage-services-page',
  imports: [Alert, Avatar, Button, EmptyState, Skeleton, SkeletonRegion],
  templateUrl: './manage-services-page.html',
  styleUrl: './manage-services-page.scss',
  providers: [{ provide: ADMIN_SERVICES_SERVICE, useClass: HttpAdminServicesService }],
})
export class ManageServicesPage {
  private readonly services = inject(ADMIN_SERVICES_SERVICE);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  private dialogOpen = false;

  protected readonly skeletonCards = SKELETON_CARDS;
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
          return this.services.applications().pipe(
            map((queue) => ({ kind: 'ready', queue, now: new Date() }) satisfies PageState),
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
   * Opens the decline dialog for the application `id` (L2-025 AC3; ADR 0049), imported on the
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
