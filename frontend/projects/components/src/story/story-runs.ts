import { Component, input } from '@angular/core';
import type { StoryRun } from '@cf/api';

/**
 * One block's words in the design system's story (block `story`): each run as text, emphasised,
 * strong or both, and inside an underlined `story__link` when it has an `https` address (L2-069
 * AC10; ADR 0097). Part of `cf-story`, drawn inline inside its paragraph, heading or list item.
 * Written out in each branch rather than through a template outlet with a context, which would
 * grow the initial bundle.
 */
@Component({
  selector: 'cf-story-runs',
  templateUrl: './story-runs.html',
  styleUrl: './story-runs.scss',
})
export class StoryRuns {
  readonly runs = input.required<readonly StoryRun[]>();
}
