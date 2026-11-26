import { Component, input, output } from '@angular/core';
import { followInApp } from './story-lead';

/** One "Most read" entry: the story's title and its page. */
export interface RankedStory {
  href: string;
  title: string;
}

/**
 * The design system's ranked list (docs/design-system/components/story.html, block `ranked`):
 * "Most read" in the rail, numbered 1 to 5 in italic display numerals, each title a link to its
 * story (L2-001 AC5). The numbers are drawn, not read: an ordered list already numbers them. A
 * plain click on a title emits `navigate`. Every text is text.
 */
@Component({
  selector: 'cf-ranked-list',
  templateUrl: './ranked-list.html',
  styleUrl: './ranked-list.scss',
})
export class RankedList {
  readonly stories = input.required<readonly RankedStory[]>();

  /** A plain click on a title, with the story's address. */
  readonly navigate = output<string>();

  protected follow(event: MouseEvent, href: string): void {
    followInApp(event, href, (to) => this.navigate.emit(to));
  }
}
