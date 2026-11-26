import { booleanAttribute, Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';
import { Skeleton } from '../skeleton/skeleton';

/** One story on the front page, worded for the screen (L2-001 AC2). */
export interface NewsStoryView {
  /** The story's own page, `/stories/<slug>`. */
  href: string;
  /** The section's name, "Community"; empty for none. */
  section: string;
  title: string;
  /** The summary; none when it has none. */
  summary: string | null;
  /** The author; empty for none. */
  author: string;
  /** "2 hours ago", "Yesterday" or "Apr 8". */
  age: string;
  /** The lead image's address; none draws no image. */
  image: string | null;
}

/** A plain click on a link inside the app, as the front page's story blocks follow it. */
export function followInApp(event: MouseEvent, href: string, emit: (href: string) => void): void {
  if (!href.startsWith('/') || href.startsWith('//') || !isPlainClick(event)) return;
  event.preventDefault();
  emit(href);
}

/**
 * The design system's story lead (docs/design-system/components/story.html, block `story-lead`):
 * the front page's single most important story, with its 16:9 image, section, title as the page's
 * `h1` and a link to the story, summary, author and age (L2-001 AC2). With `loading` it draws
 * skeletons in the same shape. A plain click on the title emits `navigate`. Every text is text.
 */
@Component({
  selector: 'cf-story-lead',
  imports: [Skeleton],
  templateUrl: './story-lead.html',
  styleUrl: './story-lead.scss',
})
export class StoryLead {
  readonly story = input<NewsStoryView | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });

  /** A plain click on the title, with the story's address. */
  readonly navigate = output<string>();

  protected follow(event: MouseEvent, href: string): void {
    followInApp(event, href, (to) => this.navigate.emit(to));
  }
}
