import { booleanAttribute, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The design system's story row (docs/design-system/components/story.html, block `story-row`):
 * one story of the river, with its section and age, title, the summary where it has one (from
 * 640 px), byline and a 4:3 photo. The title is the link to the story. With `loading` it is the
 * same row of `cf-skeleton`s. Words are rendered as text.
 */
@Component({
  selector: 'cf-story-row',
  imports: [Skeleton],
  templateUrl: './story-row.html',
  styleUrl: './story-teaser.scss',
})
export class StoryRow {
  readonly href = input('');
  readonly section = input('');
  readonly heading = input('');
  readonly summary = input('');
  readonly author = input('');
  readonly age = input('');
  readonly image = input<string | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });
}
