import { booleanAttribute, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The design system's lead story (docs/design-system/components/story.html, block `story-lead`):
 * the front page's most important story, with its 16:9 photo, section, headline as the page's
 * `h1`, summary and byline. The headline is the link to the story. With `loading` it is the same
 * shape in `cf-skeleton`s, for a `cf-skeleton-region` around it to name. Words are rendered as
 * text.
 */
@Component({
  selector: 'cf-story-lead',
  imports: [Skeleton],
  templateUrl: './story-lead.html',
  styleUrl: './story-teaser.scss',
})
export class StoryLead {
  readonly href = input('');
  readonly section = input('');
  readonly heading = input('');
  readonly summary = input('');
  readonly author = input('');
  /** "2 hours ago". */
  readonly age = input('');
  readonly image = input<string | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });
}
