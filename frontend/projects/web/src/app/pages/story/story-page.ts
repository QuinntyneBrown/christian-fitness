import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { type PublishedStoryDto, STORIES_SERVICE, storyImageUrl } from '@cf/api';
import { Button, Container, EmptyState, ErrorPage, SkipLink, Story, TopBar } from '@cf/components';
import { storyBlocks, storyReaderWhen, storySectionLabel } from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpStoriesService } from '../../services/http-stories.service';

/**
 * A published story at `/stories/:slug` (L2-061; ADR 0105; mock `story/`), for anyone. Routed
 * twice: for a visitor with the masthead (route data `masthead`), and inside the member shell
 * under the member navigation (AC13). While it loads, skeletons stand in for the headline, image
 * and text; a slug that is no published story's shows the not-found view at its address; any other
 * failure shows "This story didn't load" with Try again and All stories (a 5xx is the
 * server-error screen's). Once shown, the document's title and description are the story's
 * headline and summary (AC11). Every word the story gives is rendered as text.
 */
@Component({
  selector: 'cf-story-page',
  imports: [Button, Container, EmptyState, ErrorPage, SkipLink, Story, TopBar],
  providers: [{ provide: STORIES_SERVICE, useClass: HttpStoriesService }],
  templateUrl: './story-page.html',
  styleUrl: './story-page.scss',
})
export default class StoryPage {
  private readonly stories = inject(STORIES_SERVICE);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private slug = '';
  private request: Subscription | null = null;

  /** True for a visitor: the masthead heads the page; a member has the shell's header. */
  protected readonly masthead = inject(ActivatedRoute).snapshot.data['masthead'] === true;
  protected readonly state = signal<'loading' | 'loaded' | 'not-found' | 'failed'>('loading');
  protected readonly story = signal<PublishedStoryDto | null>(null);
  private readonly now = signal(new Date());
  protected readonly section = computed(() => storySectionLabel(this.story()?.section ?? null));
  protected readonly when = computed(() => {
    const story = this.story();
    return story ? storyReaderWhen(story.publishedAt, story.text, this.now()) : '';
  });
  protected readonly image = computed(() => {
    const image = this.story()?.image;
    return image ? storyImageUrl(image.key) : null;
  });
  protected readonly blocks = computed(() => storyBlocks(this.story()?.text ?? ''));

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.slug = params.get('slug') ?? '';
        this.load();
      });
    // The description belongs to this story; the next page starts without it.
    this.destroyRef.onDestroy(() => this.meta.removeTag('name="description"'));
  }

  /** Asks for the story again, in place. */
  protected retry(): void {
    this.load();
  }

  private load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.stories
      .get(this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (story) => {
          this.now.set(new Date());
          this.story.set(story);
          this.state.set('loaded');
          this.title.setTitle(story.headline);
          this.meta.updateTag({ name: 'description', content: story.summary });
        },
        // A 5xx has already opened the server-error screen; a 404 is "not found", anything else "failed".
        error: (error: unknown) =>
          this.state.set(
            error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'failed',
          ),
      });
  }
}
