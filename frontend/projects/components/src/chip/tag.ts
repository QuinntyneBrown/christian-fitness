import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The design system's tag (docs/design-system/components/chip.html, "Tags"): a read-only label
 * that shows an interest back, accent-subtle, or, `outline`d, a listing's focus (mock
 * `listing-profile/default`). `small` is the tighter `tag--sm`, as "Joined" on a series row. Never
 * a control. The word is projected as text.
 */
@Component({
  selector: 'cf-tag',
  templateUrl: './tag.html',
  styleUrl: './tag.scss',
})
export class Tag {
  readonly outline = input(false, { transform: booleanAttribute });
  readonly small = input(false, { transform: booleanAttribute });

  /** Composed here: a `[class.x]` binding would grow every app's initial bundle. */
  protected classes(): string {
    return `tag${this.outline() ? ' tag--outline' : ''}${this.small() ? ' tag--sm' : ''}`;
  }
}
