import { Component, input } from '@angular/core';

/**
 * The design system's `empty-inline` (docs/design-system/assets/components.css, "Empty and error
 * states"): what goes in an empty section, rendered as text, and an optional next step projected
 * through `[slot=action]`.
 */
@Component({
  selector: 'cf-empty-inline',
  templateUrl: './empty-inline.html',
  styleUrl: './empty-inline.scss',
})
export class EmptyInline {
  readonly text = input.required<string>();
}
