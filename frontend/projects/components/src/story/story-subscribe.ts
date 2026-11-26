import { Component, input } from '@angular/core';
import { Button } from '../button/button';

/**
 * The Weekly box after the design system's story (block `story-subscribe`; L2-061 AC6): "The
 * Abundant Weekly" and Subscribe free leading to `href`. Part of `cf-story`, in its own stylesheet.
 */
@Component({
  selector: 'cf-story-subscribe',
  imports: [Button],
  templateUrl: './story-subscribe.html',
  styleUrl: './story-subscribe.scss',
})
export class StorySubscribe {
  readonly href = input.required<string>();
}
