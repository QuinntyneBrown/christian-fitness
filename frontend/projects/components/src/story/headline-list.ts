import { booleanAttribute, Component, input, output } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';
import { followInApp, type NewsStoryView } from './story-lead';

const SKELETON_ROWS = [1, 2, 3, 4];

/**
 * The design system's headline list (docs/design-system/components/story.html, blocks
 * `headline-list`, `headline`): the four stories beside the lead under an ink rule, each with its
 * section, title linking to the story, author and age, and a small image (L2-001 AC2). With
 * `loading` it draws four skeleton rows. A plain click on a title emits `navigate`. Every text is
 * text.
 */
@Component({
  selector: 'cf-headline-list',
  imports: [Skeleton],
  templateUrl: './headline-list.html',
  styleUrl: './headline-list.scss',
})
export class HeadlineList {
  readonly stories = input<readonly NewsStoryView[]>([]);
  readonly loading = input(false, { transform: booleanAttribute });
  /** No ink rule above (`headline-list--plain`): an issue's "Worth your time". */
  readonly plain = input(false, { transform: booleanAttribute });
  /** The titles' heading level: 2 on the front page, 3 under a section's own heading. */
  readonly level = input<2 | 3>(2);

  /** A plain click on a title, with the story's address. */
  readonly navigate = output<string>();

  protected readonly skeletons = SKELETON_ROWS;

  protected follow(event: MouseEvent, href: string): void {
    followInApp(event, href, (to) => this.navigate.emit(to));
  }
}
