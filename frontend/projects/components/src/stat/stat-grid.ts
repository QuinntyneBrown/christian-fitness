import { Component, input } from '@angular/core';

/** One figure: its label and its value, already formatted ("2,431"). */
export interface StatItem {
  label: string;
  value: string;
}

/**
 * The design system's stat tiles (docs/design-system/components/stat.html, "Stat tile"): smaller
 * figures in a two-column description list at every width. Read-only, never focusable, never
 * counting up. Words are rendered as text.
 */
@Component({
  selector: 'cf-stat-grid',
  templateUrl: './stat-grid.html',
  styleUrl: './stat-grid.scss',
})
export class StatGrid {
  readonly items = input.required<readonly StatItem[]>();
}
