import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { COMMUNITY_PICK_SERVICE, type PickableEventDto } from '@cf/api';
import {
  Button,
  EmptyState,
  EventChoices,
  PickArt,
  PickAsset,
  PickEmpty,
  SegmentedControl,
  type SegmentedOption,
  Skeleton,
  SkeletonRegion,
  Textarea,
} from '@cf/components';
import {
  PICK_ASSETS,
  PICK_NOTE_MAX,
  PICK_PLATFORMS,
  pickArtTextOf,
  pickChoiceOf,
  pickFileNameOf,
  pickNoteHintOf,
  pickPlatformOf,
  type PickArtText,
  type PickAssetSpec,
} from '@cf/domain';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpCommunityPickService } from '../../services/http-community-pick.service';

/** What the events show: skeletons, the events and the site's address, or the error state. */
type ListState =
  | { kind: 'loading' }
  | { kind: 'ready'; siteOrigin: string; events: readonly PickableEventDto[] }
  | { kind: 'failed' };

/** One graphic made: its spec and the object URL of its PNG. */
interface MadeImage {
  spec: PickAssetSpec;
  url: string;
  fileName: string;
}

/** The assets last made, and the event and note they were made from. */
interface Made {
  eventId: string;
  note: string;
  art: PickArtText;
  images: readonly MadeImage[];
}

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
    PickAsset,
    PickEmpty,
    SegmentedControl,
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  /** Aborts a photo still loading when the page goes. */
  private readonly abort = new AbortController();
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
  protected readonly creating = signal(false);
  protected readonly failed = signal(false);
  /** The assets last made; they stay until new ones are made (L2-072 AC8). */
  protected readonly made = signal<Made | null>(null);
  /** The event or the note differs from what the assets shown were made from. */
  protected readonly changed = computed(() => {
    const made = this.made();
    return made !== null && (made.eventId !== this.chosenId() || made.note !== this.note().trim());
  });
  private readonly platformKey = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('platform'))),
    { initialValue: null },
  );
  protected readonly platform = computed(() => pickPlatformOf(this.platformKey()));
  protected readonly platformOptions = computed((): SegmentedOption[] =>
    PICK_PLATFORMS.map((platform) => ({
      label: platform.name,
      href: `/community-pick?platform=${platform.key}`,
      current: platform.key === this.platform().key,
    })),
  );
  /** The asset grid's layout: Instagram's post and story side by side, else one beside its caption. */
  protected readonly assetsClass = computed(() =>
    this.platform().key === 'instagram' ? 'assets assets--insta' : 'assets assets--pair',
  );
  /** The images of the platform shown. */
  protected readonly shown = computed(() => {
    const made = this.made();
    if (!made) return [];
    const keys = new Set(this.platform().assets.map((asset) => asset.key));
    return made.images.filter((image) => keys.has(image.spec.key));
  });
  protected readonly preview = computed(() => {
    const event = this.chosen();
    if (!event) return null;
    return {
      ...pickArtTextOf(event, this.note()),
      photoSrc: this.photoOf(event),
    };
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.abort.abort();
      this.release();
    });
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

  protected async create(event: Event): Promise<void> {
    event.preventDefault();
    const chosen = this.chosen();
    if (!chosen || this.creating()) return;
    const note = this.note().trim();
    const list = this.list();
    const art = pickArtTextOf(chosen, note);
    this.creating.set(true);
    this.failed.set(false);
    let blobs: Blob[];
    try {
      const { renderPickArt } = await import('./pick-art-renderer');
      blobs = await renderPickArt(
        { ...art, photoSrc: this.photoOf(chosen) },
        PICK_ASSETS,
        this.abort.signal,
      );
    } catch {
      if (this.abort.signal.aborted) return;
      this.creating.set(false);
      this.failed.set(true);
      return;
    }
    if (this.abort.signal.aborted) return;
    this.release();
    this.made.set({
      eventId: chosen.id,
      note,
      art,
      images: PICK_ASSETS.map((spec, i) => ({
        spec,
        url: URL.createObjectURL(blobs[i]),
        fileName: pickFileNameOf(chosen.title, spec.key),
      })),
    });
    this.creating.set(false);
    if (list.kind !== 'ready') return;
    // A pick that fails to record changes nothing on screen (ADR 0098).
    this.api
      .record(chosen.id, note)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (recorded) => this.showPicked(recorded.eventId, recorded.pickedAt),
        error: () => undefined,
      });
  }

  protected save(image: MadeImage): void {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.fileName;
    link.click();
  }

  protected showPlatform(href: string): void {
    void this.router.navigateByUrl(href);
  }

  protected choose(id: string): void {
    this.chosenId.set(id);
  }

  protected tryAgain(): void {
    this.reload.next();
  }

  private photoOf(event: PickableEventDto): string | null {
    return event.imageKey ? `/api/events/images/${encodeURIComponent(event.imageKey)}` : null;
  }

  /** Shows "Last picked" on the event just picked, in place (L2-072 AC13). */
  private showPicked(eventId: string, pickedAt: string): void {
    this.list.update((list) =>
      list.kind === 'ready'
        ? {
            ...list,
            events: list.events.map((event) =>
              event.id === eventId ? { ...event, lastPickedAt: pickedAt } : event,
            ),
          }
        : list,
    );
  }

  /** Revokes the object URLs of the assets shown. */
  private release(): void {
    for (const image of this.made()?.images ?? []) URL.revokeObjectURL(image.url);
  }
}
