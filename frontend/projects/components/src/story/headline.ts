import { booleanAttribute, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The design system's headline (docs/design-system/components/story.html, block `headline`): one
 * of the four top stories beside the lead, with its section, title, byline, age and a square
 * photo. The title is the link to the story. The screen lists them in a `headline-list`. With
 * `loading` it is the same row of `cf-skeleton`s. Words are rendered as text.
 */
@Component({
  selector: 'cf-headline',
  imports: [Skeleton],
  templateUrl: './headline.html',
  styleUrl: './story-teaser.scss',
})
export class Headline {
  readonly href = input('');
  readonly section = input('');
  readonly heading = input('');
  readonly author = input('');
  readonly age = input('');
  readonly image = input<string | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });
}
