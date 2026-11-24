import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type EventSummaryDto,
  PUBLIC_EVENTS_SERVICE,
  PUBLIC_PROFESSIONALS_SERVICE,
  type LandingEventDto,
} from '@cf/api';
import {
  Button,
  EmptyState,
  EventRow,
  Footer,
  InlineMessage,
  List,
  Seal,
  Skeleton,
  SkeletonRegion,
  TopBar,
} from '@cf/components';
import { type EventCardView, eventCardViewOf } from '@cf/domain';
import type { Subscription } from 'rxjs';
import { LandingProfessionalsOnView } from './landing-professionals-on-view';
import { HttpPublicProfessionalsService } from '../../services/http-public-professionals.service';
import { HttpPublicEventsService } from '../../services/http-public-events.service';

/** How many events the landing page asks for (L2-001 AC1). */
const TAKE = 3;
const SKELETON_ROWS = [{ id: '1' }, { id: '2' }, { id: '3' }];

/** One row of the "Coming up" list, worded for a visitor. */
interface LandingRow {
  id: string;
  month: string;
  day: string;
  heading: string;
  meta: string;
}

/**
 * The public landing page at `/` (L2-001, L2-002; ADR 0037): the headline, the next three
 * published events, what members get, John 10:10 and the calls to join and sign in. A signed-in
 * member never sees it (`redirectSignedInGuard`). `PUBLIC_EVENTS_SERVICE` is bound here, so the
 * client and its request live only while the page does. The events show as skeleton rows while
 * they load, an inline empty message when there are none and an inline error with Try again when
 * they fail; the rest of the page does not wait for them. Each row leads to Join. The
 * professionals below are fetched, as code and data, only when they near the viewport
 * (`cfLandingProfessionalsOnView`; ADR 0056).
 */
@Component({
  selector: 'cf-landing-page',
  imports: [
    Button,
    EmptyState,
    EventRow,
    Footer,
    InlineMessage,
    LandingProfessionalsOnView,
    List,
    Seal,
    Skeleton,
    SkeletonRegion,
    TopBar,
  ],
  providers: [
    { provide: PUBLIC_EVENTS_SERVICE, useClass: HttpPublicEventsService },
    { provide: PUBLIC_PROFESSIONALS_SERVICE, useClass: HttpPublicProfessionalsService },
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  private readonly events = inject(PUBLIC_EVENTS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;

  protected readonly skeletons = SKELETON_ROWS;
  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly rows = signal<LandingRow[]>([]);

  constructor() {
    this.load();
  }

  /** Asks for the events again, in place. */
  protected load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.events
      .upcoming(TAKE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (events) => {
          this.rows.set(
            events.slice(0, TAKE).map((event) => rowOf(eventCardViewOf(toSummary(event)))),
          );
          this.state.set('loaded');
        },
        error: () => this.state.set('failed'),
      });
  }
}

function toSummary(event: LandingEventDto): EventSummaryDto {
  return { ...event, area: '', priceCents: 0, capacity: 0, going: 0, imageKey: null };
}

function rowOf(card: EventCardView): LandingRow {
  return {
    id: card.id,
    month: card.month,
    day: card.day,
    heading: card.heading,
    meta: `${card.time} · ${card.place}`,
  };
}
