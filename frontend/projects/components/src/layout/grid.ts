import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The design system's grid (docs/design-system/components/layout.html, "Grid"): the page's column
 * grid with its gutter or, with `cards`, an auto-fill grid of columns at least 18 rem wide that adds
 * columns as space allows, with no breakpoints.
 */
@Component({
  selector: 'cf-grid',
  templateUrl: './grid.html',
  styleUrl: './grid.scss',
})
export class Grid {
  readonly cards = input(false, { transform: booleanAttribute });
}
