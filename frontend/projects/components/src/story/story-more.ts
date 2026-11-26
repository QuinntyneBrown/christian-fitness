import { Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/** One "Keep reading" card (L2-061 AC6; mock `story/default`), leading to its story. */
export interface StoryMoreCard {
  href: string;
  /** The card's image; none draws no image. */
  image: string | null;
  /** The section's name, "Community"; empty for none. */
  section: string;
  title: string;
  /** "Priya Raman · Yesterday". */
  meta: string;
}

/**
 * "Keep reading" after the design system's story (blocks `story-more`, `story-card`; L2-061 AC6).
 * Part of `cf-story`, in its own stylesheet. A plain click on a card inside the app (`/…`) emits
 * `navigate` with its address; any other click is the browser's.
 */
@Component({
  selector: 'cf-story-more',
  templateUrl: './story-more.html',
  styleUrl: './story-more.scss',
})
export class StoryMore {
  readonly cards = input.required<readonly StoryMoreCard[]>();

  /** A plain click on a card inside the app, with its address. */
  readonly navigate = output<string>();

  protected follow(event: MouseEvent, href: string): void {
    if (!href.startsWith('/') || href.startsWith('//') || !isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
