import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_STORIES_SERVICE, type ApiError, type StoryPreviewDto } from '@cf/api';
import { Banner, Button, EmptyState, Story, type StoryNextCard } from '@cf/components';
import {
  storyBlocks,
  storyNextLabel,
  storyPreviewNotice,
  storyReaderWhen,
  storySectionLabel,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpAdminStoriesService } from '../../services/http-admin-stories.service';

/** The admin not-found screen, shown at the preview's own address (L2-069 AC13). */
const NOT_FOUND = '/not-found';

/**
 * The story preview (mock docs/mocks/pages/admin-story-preview/; L2-069 AC10, AC13; ADR 0097), at
 * `/stories/<id>/preview`, opened by the editor's Preview in a new tab: a warning banner says it
 * is a preview, names the status and offers Close preview back to the editor; under it, the story
 * as readers will see it, its text made into blocks by the one sanitising renderer. While it
 * loads, skeletons; when it does not load, Try again and Back to the editor; an unknown story shows
 * the not-found page at its address. Outside the staff shell, as readers see no console; the
 * service is this screen's own.
 */
@Component({
  selector: 'cf-story-preview-page',
  imports: [Banner, Button, EmptyState, Story],
  templateUrl: './story-preview-page.html',
  styleUrl: './story-preview-page.scss',
  providers: [{ provide: ADMIN_STORIES_SERVICE, useClass: HttpAdminStoriesService }],
})
export default class StoryPreviewPage {
  private readonly api = inject(ADMIN_STORIES_SERVICE);
  private readonly router = inject(Router);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private reading: Subscription | undefined;

  protected readonly state = signal<'loading' | 'ready' | 'failed'>('loading');
  protected readonly preview = signal<StoryPreviewDto | null>(null);
  protected readonly now = signal(new Date());
  protected readonly editorHref = `/stories/${encodeURIComponent(this.id)}`;
  protected readonly notice = computed(() => {
    const preview = this.preview();
    return storyPreviewNotice(
      this.state() === 'ready' && preview ? preview.status : (this.state() as 'loading' | 'failed'),
    );
  });
  protected readonly section = computed(() => storySectionLabel(this.preview()?.section ?? null));
  protected readonly blocks = computed(() => storyBlocks(this.preview()?.text ?? ''));
  protected readonly when = computed(() => {
    const preview = this.preview();
    return preview ? storyReaderWhen(preview.publishedAt, preview.text, this.now()) : '';
  });
  /** The card shows without a link: the reader's address is the member app's, not this one's. */
  protected readonly next = computed<StoryNextCard | null>(() => {
    const next = this.preview()?.next;
    return next ? { label: storyNextLabel(next.kind), title: next.text, href: null } : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.reading?.unsubscribe());
    this.load();
  }

  protected load(): void {
    this.reading?.unsubscribe();
    this.state.set('loading');
    this.reading = this.api.preview(this.id).subscribe({
      next: (preview) => {
        this.now.set(new Date());
        this.preview.set(preview);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        if (error?.status === 404) {
          void this.router.navigateByUrl(NOT_FOUND, { skipLocationChange: true });
        } else {
          this.state.set('failed');
        }
      },
    });
  }
}
