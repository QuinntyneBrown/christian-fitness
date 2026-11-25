import { inject, Injectable, type OnDestroy, signal } from '@angular/core';
import {
  ADMIN_STORIES_SERVICE,
  type AdminStoryDto,
  type ApiError,
  type StoryFieldsDto,
  type StoryOptionsDto,
  type StoryPlacementName,
  type StoryPointerDto,
  type StoryStatusName,
} from '@cf/api';
import type { Subscription } from 'rxjs';

/** How long after the last edit a Draft or a story In review is saved (L2-069 AC11). */
export const STORY_AUTOSAVE_MS = 2_000;

/** How often the bar's "Saved 2 min ago" is worded again. */
export const STORY_CLOCK_MS = 30_000;

/** The front page's places, as Publishing names them (L2-069 AC1). */
export const STORY_PLACEMENTS: readonly { value: StoryPlacementName; label: string }[] = [
  { value: 'lead', label: 'Lead story' },
  { value: 'top', label: 'Top headlines' },
  { value: 'latest', label: 'The latest' },
];

/** A new story's fields: nothing written, placed with the latest. */
export const BLANK_STORY: StoryFieldsDto = {
  headline: '',
  summary: '',
  text: '',
  section: null,
  bylineId: null,
  placement: 'latest',
  includeInWeekly: false,
  pointsTo: null,
  nextStepText: null,
  nextStepLink: null,
  slug: null,
  image: null,
};

/** One choice of "Points readers to": its value in the select and its words. */
export interface StoryPointerOption {
  value: string;
  label: string;
}

/**
 * "Points readers to" (L2-069 AC1): Nothing, then each published event, then each listed listing,
 * worded "Event · Easter Sunrise 5K" and "Listing · Lena Park, RD" as the mock words them.
 */
export function storyPointerOptions(options: StoryOptionsDto | null): StoryPointerOption[] {
  return [
    { value: '', label: 'Nothing' },
    ...(options?.events ?? []).map((e) => ({
      value: `event:${e.id}`,
      label: `Event · ${e.title}`,
    })),
    ...(options?.listings ?? []).map((l) => ({
      value: `listing:${l.id}`,
      label: `Listing · ${l.name}`,
    })),
  ];
}

/** The select's value for a pointer; empty for none. */
export function storyPointerValue(pointer: StoryPointerDto | null): string {
  return pointer ? `${pointer.kind}:${pointer.id}` : '';
}

/** The pointer a select's value names; none for "Nothing" or a value that names no kind. */
export function storyPointerOf(value: string): StoryPointerDto | null {
  const at = value.indexOf(':');
  const kind = value.slice(0, at);
  const id = value.slice(at + 1);
  return at > 0 && id && (kind === 'event' || kind === 'listing') ? { kind, id } : null;
}

/** Where the editor's story is: being read, ready, missing (404) or not read (another failure). */
export type StoryEditorLoad = 'loading' | 'ready' | 'missing' | 'failed';

/** The last save: none pending, under way, failed, or refused over a newer version. */
export type StorySaveState = 'idle' | 'saving' | 'failed' | 'conflict';

/**
 * The story editor's state (L2-069 AC1, AC11, AC12; ADR 0097): the fields as typed, the status,
 * version and last save of the story they belong to, and the save under way. A Draft or a story In
 * review is saved {@link STORY_AUTOSAVE_MS} after the last edit, each edit restarting the pause; a
 * new story is created on its first save. A Scheduled or Published story is never saved as it is
 * typed. A failed save keeps the fields; a save refused with `story_changed` stops saving until the
 * Admin loads the newer version or keeps theirs over it. Provided on the editor page, so its
 * timers and requests end with the visit (AGENTS.md, "Release everything you acquire").
 */
@Injectable()
export class StoryEditorStore implements OnDestroy {
  private readonly api = inject(ADMIN_STORIES_SERVICE);
  private readonly state = {
    load: signal<StoryEditorLoad>('loading'),
    id: signal<string | null>(null),
    status: signal<StoryStatusName>('draft'),
    savedAt: signal<string | null>(null),
    publishedAt: signal<string | null>(null),
    fields: signal<StoryFieldsDto>(BLANK_STORY),
    save: signal<StorySaveState>('idle'),
    options: signal<StoryOptionsDto | null>(null),
    now: signal(new Date()),
  };
  private version = 0;
  /** Edits made since the save under way began, so another save follows it. */
  private editedSince = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private clock: ReturnType<typeof setInterval> | undefined;
  private reading: Subscription | undefined;
  private saving: Subscription | undefined;
  /** Whether a save is under way; a synchronous answer ends it before `saving` is assigned. */
  private inFlight = false;
  private optionsRead: Subscription | undefined;
  private created: ((id: string) => void) | undefined;
  private missing: (() => void) | undefined;

  readonly load = this.state.load.asReadonly();
  readonly id = this.state.id.asReadonly();
  readonly status = this.state.status.asReadonly();
  readonly savedAt = this.state.savedAt.asReadonly();
  readonly publishedAt = this.state.publishedAt.asReadonly();
  readonly fields = this.state.fields.asReadonly();
  readonly saveState = this.state.save.asReadonly();
  readonly options = this.state.options.asReadonly();
  /** The time the bar words the last save against, moved on every {@link STORY_CLOCK_MS}. */
  readonly now = this.state.now.asReadonly();

  /** Starts an empty Draft; `created` hears its id once its first save keeps it. */
  openNew(created: (id: string) => void): void {
    this.reset();
    this.created = created;
    this.state.load.set('ready');
    this.startClock();
  }

  /** Reads the story `id`: ready, missing on a 404 (when `missing` hears of it), or failed. */
  open(id: string, missing?: () => void): void {
    this.reset();
    this.missing = missing;
    this.state.id.set(id);
    this.read(id, (story) => this.take(story));
    this.startClock();
  }

  /** Reads the story again after it failed to load. */
  retry(): void {
    const id = this.state.id();
    if (id) this.read(id, (story) => this.take(story));
  }

  /** Reads the bylines, events and listings the Publishing panel offers. */
  loadOptions(): void {
    this.optionsRead?.unsubscribe();
    this.optionsRead = this.api.options().subscribe({
      next: (options) => this.state.options.set(options),
      error: () => this.state.options.set({ bylines: [], events: [], listings: [] }),
    });
  }

  /** Takes an edit; a Draft or a story In review is saved once typing pauses. */
  edit(patch: Partial<StoryFieldsDto>): void {
    this.state.fields.update((fields) => ({ ...fields, ...patch }));
    if (!this.autosaves()) return;
    if (this.inFlight) this.editedSince = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), STORY_AUTOSAVE_MS);
  }

  /** Replaces what was typed with the version someone else saved (L2-069 AC12). */
  loadNewer(): void {
    const id = this.state.id();
    if (!id) return;
    this.read(id, (story) => this.take(story));
  }

  /** Saves what was typed over the version someone else saved (L2-069 AC12). */
  keepMine(): void {
    const id = this.state.id();
    if (!id) return;
    this.read(id, (story) => {
      this.version = story.version;
      this.state.load.set('ready');
      this.state.save.set('idle');
      this.save();
    });
  }

  ngOnDestroy(): void {
    this.reset();
    this.optionsRead?.unsubscribe();
    this.optionsRead = undefined;
  }

  private autosaves(): boolean {
    const status = this.state.status();
    return (status === 'draft' || status === 'review') && this.state.save() !== 'conflict';
  }

  private save(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.inFlight || this.state.save() === 'conflict') return;
    this.inFlight = true;
    this.editedSince = false;
    this.state.save.set('saving');
    const id = this.state.id();
    const fields = this.state.fields();
    const request = id
      ? this.api.save(id, { ...fields, version: this.version })
      : this.api.create(fields);
    this.saving = request.subscribe({
      next: (story) => {
        this.inFlight = false;
        this.version = story.version;
        this.state.savedAt.set(story.savedAt);
        this.state.now.set(new Date());
        this.state.save.set('idle');
        if (!id) {
          this.state.id.set(story.id);
          this.created?.(story.id);
        }
        if (this.editedSince && this.autosaves()) this.save();
      },
      error: (error: ApiError) => {
        this.inFlight = false;
        this.state.save.set(error?.code === 'story_changed' ? 'conflict' : 'failed');
      },
    });
  }

  private read(id: string, then: (story: AdminStoryDto) => void): void {
    this.reading?.unsubscribe();
    if (this.state.load() !== 'ready') this.state.load.set('loading');
    this.reading = this.api.get(id).subscribe({
      next: then,
      error: (error: ApiError) => {
        if (this.state.load() !== 'ready') {
          this.state.load.set(error?.status === 404 ? 'missing' : 'failed');
          if (error?.status === 404) this.missing?.();
        } else {
          this.state.save.set('failed');
        }
      },
    });
  }

  private take(story: AdminStoryDto): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.version = story.version;
    this.state.status.set(story.status);
    this.state.savedAt.set(story.savedAt);
    this.state.publishedAt.set(story.publishedAt);
    this.state.fields.set(fieldsOf(story));
    this.state.save.set('idle');
    this.state.now.set(new Date());
    this.state.load.set('ready');
  }

  private startClock(): void {
    clearInterval(this.clock);
    this.clock = setInterval(() => this.state.now.set(new Date()), STORY_CLOCK_MS);
  }

  private reset(): void {
    clearTimeout(this.timer);
    clearInterval(this.clock);
    this.timer = undefined;
    this.clock = undefined;
    this.reading?.unsubscribe();
    this.saving?.unsubscribe();
    this.reading = this.saving = undefined;
    this.created = undefined;
    this.missing = undefined;
    this.version = 0;
    this.inFlight = false;
    this.editedSince = false;
    this.state.load.set('loading');
    this.state.id.set(null);
    this.state.status.set('draft');
    this.state.savedAt.set(null);
    this.state.publishedAt.set(null);
    this.state.fields.set(BLANK_STORY);
    this.state.save.set('idle');
  }
}

function fieldsOf(story: AdminStoryDto): StoryFieldsDto {
  return {
    headline: story.headline,
    summary: story.summary,
    text: story.text,
    section: story.section,
    bylineId: story.bylineId,
    placement: story.placement,
    includeInWeekly: story.includeInWeekly,
    pointsTo: story.pointsTo,
    nextStepText: story.nextStepText,
    nextStepLink: story.nextStepLink,
    slug: story.slug,
    image: story.image,
  };
}
