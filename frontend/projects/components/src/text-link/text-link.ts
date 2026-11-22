import { Component, input } from '@angular/core';

/**
 * The design system's `text-link` block (docs/design-system/assets/components.css, "Typography"):
 * a small accent link such as "Forgot your password?", with a 44 × 44 px touch target on coarse
 * pointers. It loads `href`; the label is projected as text.
 */
@Component({
  selector: 'cf-text-link',
  templateUrl: './text-link.html',
  styleUrl: './text-link.scss',
})
export class TextLink {
  readonly href = input.required<string>();
}
