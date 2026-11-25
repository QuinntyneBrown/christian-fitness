import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The design system's tag (docs/design-system/components/chip.html, "Tags"): a read-only label
 * that shows an interest back, accent-subtle, or, `outline`d, a listing's focus (mock
 * `listing-profile/default`). Never a control. The word is projected as text.
 */
@Component({
  selector: 'cf-tag',
  templateUrl: './tag.html',
  styleUrl: './tag.scss',
})
export class Tag {
  readonly outline = input(false, { transform: booleanAttribute });
}
