import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { COMMUNITY_PICK_SERVICE, type PickableEventDto } from '@cf/api';
import {
  Button,
  EmptyState,
  EventChoices,
  PickArt,
  PickEmpty,
  Skeleton,
  SkeletonRegion,
  Textarea,
} from '@cf/components';
import { PICK_NOTE_MAX, pickArtTextOf, pickChoiceOf, pickNoteHintOf } from '@cf/domain';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpCommunityPickService } from '../../services/http-community-pick.service';

/** What the events show: skeletons, the events and the site's address, or the error state. */
type ListState =
  | { kind: 'loading' }
  | { kind: 'ready'; siteOrigin: string; events: readonly PickableEventDto[] }
  | { kind: 'failed' };

/**
 * Community Pick (mock docs/mocks/pages/admin-community-pick/; L2-072; ADR 0098): the published
 * events still to come as one radio group, the one `?event=` names chosen (else the first), and
 * "Why it's a pick", whose hint counts its 70 characters. Until assets are made, the right side
 * previews the graphic and says what will be made. While the events load, skeleton rows; with
 * none, the empty state pointing to Events; when they do not load, the error state with Try
 * again. A Moderator uses it as an Admin does. Its service is this screen's own (AGENTS.md,
 * "Scope state to its use").
 */
@Component({
  selector: 'cf-community-pick-page',
  imports: [
    Button,
    EmptyState,
    EventChoices,
    PickArt,
    PickEmpty,
    Skeleton,
    SkeletonRegion,
    Textarea,
  ],
  templateUrl: './community-pick-page.html',
  styleUrl: './community-pick-page.scss',
  providers: [{ provide: COMMUNITY_PICK_SERVICE, useClass: HttpCommunityPickService }],
})
export default class CommunityPickPage {
  private readonly api = inject(COMMUNITY_PICK_SERVICE);
  /** The event "Make it a pick" asked for, if any. */
  private readonly asked = inject(ActivatedRoute).snapshot.queryParamMap.get('event');
  private readonly reload = new Subject<void>();

  protected readonly noteMax = PICK_NOTE_MAX;
  protected readonly skeletonRows = [0, 1, 2, 3];
  protected readonly list = signal<ListState>({ kind: 'loading' });
  /** The id of the event chosen. */
  protected readonly chosenId = signal<string | null>(null);
  protected readonly note = signal('');

  protected readonly events = computed(() => {
    const list = this.list();
    return list.kind === 'ready' ? list.events : [];
  });
  protected readonly choices = computed(() => this.events().map(pickChoiceOf));
  protected readonly chosen = computed(
    () => this.events().find((event) => event.id === this.chosenId()) ?? null,
  );
  protected readonly noteHint = computed(() => pickNoteHintOf(this.note()));
  protected readonly preview = computed(() => {
    const event = this.chosen();
    if (!event) return null;
    return {
      ...pickArtTextOf(event, this.note()),
      photoSrc: event.imageKey ? `/api/events/images/${encodeURIComponent(event.imageKey)}` : null,
    };
  });

  constructor() {
    this.reload
      .pipe(
        startWith(undefined),
        switchMap(() =>
          this.api.events().pipe(
            map((answer): ListState => ({
              kind: 'ready',
              siteOrigin: answer.siteOrigin,
              events: answer.events,
            })),
            catchError(() => of<ListState>({ kind: 'failed' })),
            startWith<ListState>({ kind: 'loading' }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        this.list.set(list);
        if (list.kind !== 'ready') return;
        const keep = list.events.some((event) => event.id === this.chosenId());
        if (keep) return;
        const asked = list.events.find((event) => event.id === this.asked);
        this.chosenId.set((asked ?? list.events[0])?.id ?? null);
      });
  }

  protected choose(id: string): void {
    this.chosenId.set(id);
  }

  protected tryAgain(): void {
    this.reload.next();
  }
}
