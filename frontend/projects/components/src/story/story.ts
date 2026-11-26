import {
  afterNextRender,
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  type OnChanges,
  output,
  type SimpleChanges,
} from '@angular/core';
import type { StoryBlock } from '@cf/api';
import { Button } from '../button/button';
import { Link } from '../link/link';
import { isPlainClick } from '../link/plain-click';
import { Skeleton } from '../skeleton/skeleton';
import { SkeletonRegion } from '../skeleton/skeleton-region';
import { StoryMore, type StoryMoreCard } from './story-more';
import { StoryRuns } from './story-runs';
import { StorySubscribe } from './story-subscribe';

export type { StoryMoreCard } from './story-more';

/** The card after a story's text (L2-061 AC4): "In the directory", the words, and where it leads. */
export interface StoryNextCard {
  label: string;
  title: string;
  /** Where the card leads; none renders the card without a link (the admin preview). */
  href: string | null;
}

/**
 * The design system's story page (docs/design-system/components/story.html, block `story`): the
 * head with the back link, the section, the headline as the page's `h1`, the dek and the byline
 * with Copy link; the body; and the story next card. The body is the blocks the domain's one
 * renderer made of the story text (L2-069 AC10; ADR 0097): paragraphs, pull quotes, headings,
 * lists, emphasis, strong and `https` links, each rendered as text, never as HTML. While
 * `loading`, skeletons stand in for the head, the figure and the body (mocks `story/loading`,
 * `admin-story-preview/loading`), with `loadingLabel` read out.
 *
 * With `copyable`, the byline holds Copy link, which emits `copyRequested`; `copied` makes it read "Link
 * copied" with a `status` saying so (L2-061 AC3; mock `story/link-copied`). With `address` set (the
 * clipboard refused) the address shows in a read-only field, focused and selected (mock
 * `story/link-refused`). A plain click on a next step inside the app (`/…`) emits `navigate` with
 * its address; any other click is the browser's.
 *
 * After the article, `more` draws "Keep reading" (`cf-story-more`), whose cards route a plain
 * click the same way, and `subscribeHref` the Weekly box (`cf-story-subscribe`) leading to
 * Subscribe (L2-061 AC6); neither shows without them.
 */
@Component({
  selector: 'cf-story',
  imports: [Button, Link, Skeleton, SkeletonRegion, StoryMore, StoryRuns, StorySubscribe],
  templateUrl: './story.html',
  styleUrl: './story.scss',
})
export class Story implements OnChanges {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** The section's name, "Nutrition"; empty for none. */
  readonly section = input('');
  readonly headline = input('');
  readonly summary = input('');
  readonly author = input('');
  /** "2 hours ago · 6 min read". */
  readonly when = input('');
  /** The lead image's address, drawn at 16:9 above the body; none draws no figure. */
  readonly image = input<string | null>(null);
  readonly blocks = input<readonly StoryBlock[]>([]);
  readonly next = input<StoryNextCard | null>(null);
  /** Where "All stories" leads, above the section; none draws no back link (the admin preview). */
  readonly backHref = input<string | null>(null);
  /** Shows Copy link in the byline. */
  readonly copyable = input(false, { transform: booleanAttribute });
  /** Copy link reads "Link copied". */
  readonly copied = input(false, { transform: booleanAttribute });
  /** The story's address, shown selected because the clipboard refused; none hides it. */
  readonly address = input<string | null>(null);
  /** Keep reading's cards; none draws no section. */
  readonly more = input<readonly StoryMoreCard[]>([]);
  /** Where the Weekly box's Subscribe leads; none draws no box (the admin preview). */
  readonly subscribeHref = input<string | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });
  readonly loadingLabel = input('Loading story');

  /** Copy link was pressed. */
  readonly copyRequested = output();
  /** A plain click on a next step inside the app, with its address. */
  readonly navigate = output<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['address'] && this.address()) {
      afterNextRender(
        () => {
          const field = this.host.nativeElement.querySelector<HTMLInputElement>('.story__address');
          field?.focus();
          field?.select();
        },
        { injector: this.injector },
      );
    }
  }

  protected follow(event: MouseEvent, href: string): void {
    if (!href.startsWith('/') || href.startsWith('//') || !isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
