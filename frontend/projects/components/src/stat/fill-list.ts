import { Component, input } from '@angular/core';
import { Fill } from './fill';

/** One event's capacity row. */
export interface FillRow {
  id: string;
  month: string;
  day: string;
  heading: string;
  place?: string;
  count: number;
  capacity: number;
}

/**
 * The design system's fill list (docs/design-system/components/stat.html, "Fill meters"):
 * registrations against capacity per event, the date and name on one line and the meter beneath,
 * beside them from 640 px. With no rows the screen shows an empty state instead. Words are
 * rendered as text.
 */
@Component({
  selector: 'cf-fill-list',
  imports: [Fill],
  templateUrl: './fill-list.html',
  styleUrl: './fill-list.scss',
})
export class FillList {
  readonly rows = input.required<readonly FillRow[]>();
  readonly label = input<string>();
}
