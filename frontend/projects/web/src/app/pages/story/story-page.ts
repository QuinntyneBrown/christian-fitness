import { DOCUMENT, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CLIPBOARD_SERVICE,
  type PublishedStoryDto,
  STORIES_SERVICE,
  STORY_READS,
  storyImageUrl,
} from '@cf/api';
import {
  Button,
  Container,
  EmptyState,
  ErrorPage,
  SkipLink,
  Story,
  type StoryMoreCard,
  type StoryNextCard,
  TopBar,
} from '@cf/components';
import {
  CopiedFlag,
  storyBlocks,
  storyCardMeta,
  storyNextLabel,
  storyReaderWhen,
  storySectionLabel,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpStoriesService } from '../../services/http-stories.service';
import { LocalStoryReads } from '../../services/local-story-reads';
import { NavigatorClipboard } from '../../services/navigator-clipboard';

/**
 * A published story at `/stories/:slug` (L2-061; ADR 0105; mock `story/`), for anyone. Routed
 * twice: for a visitor with the masthead (route data `masthead`), and inside the member shell
 * under the member navigation (AC13). While it loads, skeletons stand in for the headline, image
 * and text; a slug that is no published story's shows the not-found view at its address; any other
 * failure shows "This story didn't load" with Try again and All stories (a 5xx is the
 * server-error screen's). Once shown, the document's title and description are the story's
 * headline and summary (AC11). Copy link puts the story's address on the clipboard and reads "Link
 * copied" for 2 seconds, or shows the address selected when the clipboard refuses (AC3); a next
 * step inside the app is followed through the router, so a visitor's guard takes them to sign in
 * and back (AC4). Once the story shows, a read of it is counted (AC12). Every word the story gives
 * is rendered as text.
 */
@Component({
  selector: 'cf-story-page',
  imports: [Button, Container, EmptyState, ErrorPage, SkipLink, Story, TopBar],
  providers: [
    { provide: STORIES_SERVICE, useClass: HttpStoriesService },
    { provide: CLIPBOARD_SERVICE, useClass: NavigatorClipboard },
    { provide: STORY_READS, useClass: LocalStoryReads },
  ],
  templateUrl: './story-page.html',
  styleUrl: './story-page.scss',
})
export default class StoryPage {
  private readonly stories = inject(STORIES_SERVICE);
  private readonly clipboard = inject(CLIPBOARD_SERVICE);
  private readonly reads = inject(STORY_READS);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly copiedFlag = new CopiedFlag();
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
  protected readonly next = computed<StoryNextCard | null>(() => {
    const next = this.story()?.next;
    return next ? { label: storyNextLabel(next.kind), title: next.text, href: next.link } : null;
  });
  protected readonly more = computed<StoryMoreCard[]>(() =>
    (this.story()?.keepReading ?? []).map((card) => ({
      href: `/stories/${encodeURIComponent(card.slug)}`,
      image: card.image ? storyImageUrl(card.image.key) : null,
      section: storySectionLabel(card.section),
      title: card.headline,
      meta: storyCardMeta(card.author, card.publishedAt, this.now()),
    })),
  );
  protected readonly copied = this.copiedFlag.copied;
  /** The address shown selected after the clipboard refused; none until then. */
  protected readonly address = signal<string | null>(null);

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.slug = params.get('slug') ?? '';
        this.load();
      });
    this.destroyRef.onDestroy(() => {
      // The description belongs to this story; the next page starts without it.
      this.describedBy()?.remove();
      this.copiedFlag.dispose();
    });
  }

  /** Copies the story's current address (L2-061 AC3). */
  protected async copyLink(): Promise<void> {
    const story = this.story();
    if (!story) return;
    const address = new URL(
      `/stories/${encodeURIComponent(story.slug)}`,
      this.document.location.href,
    ).href;
    if (await this.clipboard.write(address)) {
      this.address.set(null);
      this.copiedFlag.raise();
    } else {
      this.address.set(address);
    }
  }

  /** Follows a next step inside the app through the router. */
  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /** Asks for the story again, in place. */
  protected retry(): void {
    this.load();
  }

  /** The document's `description` meta, which the server's shell may already hold (ADR 0073). */
  private describedBy(): HTMLMetaElement | null {
    return this.document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  }

  /**
   * Sets the document's description to the story's summary. Written through the document rather
   * than Angular's `Meta`, whose code would otherwise join the initial bundle.
   */
  private describe(text: string): void {
    let meta = this.describedBy();
    if (!meta) {
      meta = this.document.createElement('meta');
      meta.name = 'description';
      this.document.head.appendChild(meta);
    }
    meta.content = text;
  }

  /**
   * Read through a former link, the story's current one replaces it in the address bar and the
   * tab's history, without asking for the story again (L2-061 AC8).
   */
  private showCurrentLink(slug: string): void {
    if (slug === this.slug) return;
    this.slug = slug;
    this.location.replaceState(`/stories/${encodeURIComponent(slug)}`);
  }

  private load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.address.set(null);
    this.request = this.stories
      .get(this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (story) => {
          this.now.set(new Date());
          this.story.set(story);
          this.showCurrentLink(story.slug);
          this.state.set('loaded');
          this.title.setTitle(story.headline);
          this.describe(story.summary);
          this.reads.count(story.id);
        },
        // A 5xx has already opened the server-error screen; a 404 is "not found", anything else "failed".
        error: (error: unknown) =>
          this.state.set(
            error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'failed',
          ),
      });
  }
}
