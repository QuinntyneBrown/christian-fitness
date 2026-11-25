import { Location } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ADMIN_STORIES_SERVICE,
  type StoryFieldsDto,
  type StoryPlacementName,
  type StorySectionName,
} from '@cf/api';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Editor,
  EmptyState,
  isPlainClick,
  Link,
  Select,
  Status,
  TextField,
} from '@cf/components';
import {
  STORY_PLACEMENTS,
  STORY_SECTIONS,
  StoryEditorStore,
  storyPointerOf,
  storyPointerOptions,
  storyPointerValue,
  storySavedText,
  storyStatusLabel,
} from '@cf/domain';
import { map } from 'rxjs';
import { HttpAdminStoriesService } from '../../services/http-admin-stories.service';

/** The admin not-found screen, shown at the story's own address (L2-069 AC15). */
const NOT_FOUND = '/not-found';

/**
 * The story editor (mock docs/mocks/pages/admin-story-editor/; L2-069; ADR 0097), at
 * `/stories/new` and `/stories/<id>`: the bar with the way back to Stories, the status and when it
 * was last saved; the Headline, Summary and Story; and the Publishing panel with the front page,
 * the Weekly, the section, the byline, what the story points readers to, its next step and its
 * link. A Draft or a story In review is saved 2 seconds after typing stops; a new story becomes a
 * Draft on its first save and takes its own address. A failed save says so above the story and
 * keeps the text; a save over a newer version offers it, or keeps what was typed over it. An
 * unknown story shows the not-found page at its address; while it loads, skeletons; when it does
 * not load, Try again and Stories. Its store and service are this screen's own.
 */
@Component({
  selector: 'cf-story-editor-page',
  imports: [Alert, Button, Card, Checkbox, Editor, EmptyState, Link, Select, Status, TextField],
  templateUrl: './story-editor-page.html',
  styleUrl: './story-editor-page.scss',
  providers: [
    { provide: ADMIN_STORIES_SERVICE, useClass: HttpAdminStoriesService },
    StoryEditorStore,
  ],
})
export default class StoryEditorPage {
  protected readonly store = inject(StoryEditorStore);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly title = inject(Title);

  protected readonly isNew = computed(() => this.store.id() === null);
  protected readonly heading = computed(() => (this.isNew() ? 'New story' : 'Edit story'));
  protected readonly statusLabel = computed(() => storyStatusLabel(this.store.status()));
  protected readonly saved = computed(() => {
    switch (this.store.saveState()) {
      case 'saving':
        return 'Saving…';
      case 'failed':
      case 'conflict':
        return 'Not saved';
      default:
        return storySavedText(
          this.store.status(),
          this.isNew() ? null : this.store.savedAt(),
          this.store.publishedAt(),
          this.store.now(),
        );
    }
  });
  protected readonly fields = this.store.fields;
  protected readonly placements = STORY_PLACEMENTS;
  protected readonly sections = STORY_SECTIONS;
  protected readonly bylines = computed(() =>
    (this.store.options()?.bylines ?? []).map((b) => ({ value: b.id, label: b.name })),
  );
  protected readonly pointers = computed(() => storyPointerOptions(this.store.options()));
  protected readonly pointer = computed(() => storyPointerValue(this.fields().pointsTo));

  constructor() {
    this.store.loadOptions();
    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => params.get('id')),
        takeUntilDestroyed(),
      )
      .subscribe((id) => {
        if (!id) {
          this.store.openNew((created) => this.created(created));
        } else if (id !== this.store.id()) {
          this.store.open(id, () => this.showNotFound());
        }
      });
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /** A plain click on one of the page's links moves in the app; a modified click is the browser's. */
  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate(href);
  }

  protected edit(patch: Partial<StoryFieldsDto>): void {
    this.store.edit(patch);
  }

  protected chooseSection(value: string): void {
    this.edit({ section: (value || null) as StorySectionName | null });
  }

  protected choosePlacement(value: string): void {
    this.edit({ placement: value as StoryPlacementName });
  }

  protected chooseByline(value: string): void {
    this.edit({ bylineId: value || null });
  }

  protected choosePointer(value: string): void {
    this.edit({ pointsTo: storyPointerOf(value) });
  }

  protected optional(value: string): string | null {
    return value.trim() ? value : null;
  }

  /** The new story was kept: it takes its own address, with no new history entry. */
  private created(id: string): void {
    this.location.replaceState(`/stories/${id}`);
    this.title.setTitle('Edit story · Christian Fitness Admin');
  }

  private showNotFound(): void {
    void this.router.navigateByUrl(NOT_FOUND, { skipLocationChange: true });
  }
}
