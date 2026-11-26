import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, input } from '@angular/core';
import type { StoryBlock, StoryRun } from '@cf/api';
import { Skeleton } from '../skeleton/skeleton';
import { SkeletonRegion } from '../skeleton/skeleton-region';

/** The card after a story's text (L2-061 AC4): "In the directory", the words, and where it leads. */
export interface StoryNextCard {
  label: string;
  title: string;
  /** Where the card leads; none renders the card without a link (the admin preview). */
  href: string | null;
}

/**
 * The design system's story page (docs/design-system/components/story.html, block `story`): the
 * head with the section, the headline as the page's `h1`, the dek and the byline; the body; and
 * the story next card. The body is the blocks the domain's one renderer made of the story text
 * (L2-069 AC10; ADR 0097): paragraphs, pull quotes, headings, lists, emphasis, strong and `https`
 * links, each rendered as text, never as HTML. While `loading`, skeletons stand in for the head,
 * the figure and the body (mock `admin-story-preview/loading`), with `loadingLabel` read out.
 */
@Component({
  selector: 'cf-story',
  imports: [NgTemplateOutlet, Skeleton, SkeletonRegion],
  templateUrl: './story.html',
  styleUrl: './story.scss',
})
export class Story {
  /** The section's name, "Nutrition"; empty for none. */
  readonly section = input('');
  readonly headline = input('');
  readonly summary = input('');
  readonly author = input('');
  /** "2 hours ago · 6 min read". */
  readonly when = input('');
  readonly blocks = input<readonly StoryBlock[]>([]);
  readonly next = input<StoryNextCard | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });
  readonly loadingLabel = input('Loading story');

  /** The runs a template context carries, typed for the template. */
  protected runs(value: unknown): readonly StoryRun[] {
    return value as readonly StoryRun[];
  }

  /** The run a template context carries, typed for the template. */
  protected run(value: unknown): StoryRun {
    return value as StoryRun;
  }

  /** The card a template context carries, typed for the template. */
  protected card(value: unknown): StoryNextCard {
    return value as StoryNextCard;
  }
}
