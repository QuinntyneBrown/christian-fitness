import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_SERVICES_SERVICE, type PendingApplicationsDto } from '@cf/api';
import { Avatar, Button, EmptyState, Skeleton, SkeletonRegion } from '@cf/components';
import { applicationSent } from '@cf/domain';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpAdminServicesService } from '../../services/http-admin-services.service';

/** What the page shows: skeleton cards, the queue (empty or not), or the error state. */
type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; queue: PendingApplicationsDto; now: Date }
  | { kind: 'failed' };

/** The cards the loading state draws (mock `admin-services/loading`). */
const SKELETON_CARDS = [0, 1, 2];

/**
 * Manage Services (mock docs/mocks/pages/admin-services/; L2-025 AC1 and AC4; ADR 0048). The
 * Applications section lists each pending application oldest first with the applicant's name, when
 * it was sent, the role and the credentials, or says nothing is waiting. While it loads, skeleton
 * cards; when it does not load, the error state with Try again. It holds one answer of at most 50
 * applications and nothing else about an applicant, all as text. Deciding an application (slice
 * 25) and the live listings (slice 23) are not here yet. Its service is this screen's own,
 * provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-manage-services-page',
  imports: [Avatar, Button, EmptyState, Skeleton, SkeletonRegion],
  templateUrl: './manage-services-page.html',
  styleUrl: './manage-services-page.scss',
  providers: [{ provide: ADMIN_SERVICES_SERVICE, useClass: HttpAdminServicesService }],
})
export class ManageServicesPage {
  private readonly services = inject(ADMIN_SERVICES_SERVICE);
  private readonly reload = new Subject<void>();

  protected readonly skeletonCards = SKELETON_CARDS;
  protected readonly state = signal<PageState>({ kind: 'loading' });

  protected readonly cards = computed(() => {
    const state = this.state();
    if (state.kind !== 'ready') return [];
    return state.queue.applications.map((application) => ({
      ...application,
      sent: applicationSent(application.submittedAt, state.now),
    }));
  });
  protected readonly total = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.queue.total : 0;
  });

  constructor() {
    this.reload
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.state.set({ kind: 'loading' });
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
    this.reload.next();
  }
}
