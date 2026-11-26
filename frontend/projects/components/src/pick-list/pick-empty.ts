import { Component, input } from '@angular/core';

/**
 * The design system's pick empty preview (docs/design-system/components/pick-list.html, block
 * `pick-empty`): before anything is made, a dashed panel with the projected graphic of what will
 * come (`cf-pick-art`), a title ("Five files, four platforms, one click") and a line saying what
 * will be made. Every text is text.
 */
@Component({
  selector: 'cf-pick-empty',
  templateUrl: './pick-empty.html',
  styleUrl: './pick-empty.scss',
})
export class PickEmpty {
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
}
