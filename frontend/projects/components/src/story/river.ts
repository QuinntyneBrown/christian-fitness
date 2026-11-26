import { booleanAttribute, Component, input, output } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';
import { followInApp, type NewsStoryView } from './story-lead';

const SKELETON_ROWS = [1, 2, 3];

/**
 * The design system's river (docs/design-system/components/story.html, blocks `river`,
 * `story-row`): a ruled title ("The latest", or a section's name as the page's `h1`) over the
 * stories, newest first, each with its section and age, title linking to the story, summary where
 * it has one (from 640 px), author and image (L2-001 AC2, AC3). What follows the list (the empty
 * line, a failure, More stories) is projected after it. With `loading` it draws three skeleton
 * rows. A plain click on a title emits `navigate`. Every text is text.
 */
@Component({
  selector: 'cf-river',
  imports: [Skeleton],
  templateUrl: './river.html',
  styleUrl: './river.scss',
})
export class River {
  readonly heading = input.required<string>();
  /** True when the title is the page's `h1` (a section, or Latest with no lead). */
  readonly pageHeading = input(false, { transform: booleanAttribute });
  readonly stories = input<readonly NewsStoryView[]>([]);
  readonly loading = input(false, { transform: booleanAttribute });

  /** A plain click on a title, with the story's address. */
  readonly navigate = output<string>();

  protected readonly skeletons = SKELETON_ROWS;

  protected follow(event: MouseEvent, href: string): void {
    followInApp(event, href, (to) => this.navigate.emit(to));
  }
}
