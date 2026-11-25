import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The design system's link variants: `inline` (`link`) inside running text, `text`
 * (`text-link`) beside a section heading, `quiet` (`text-link--quiet`) for a secondary escape,
 * `ui` (`text-link--ui`) standing alone under a page title, and `back` (`back-link`) to the parent
 * list with a leading arrow.
 */
export type LinkVariant = 'inline' | 'text' | 'quiet' | 'ui' | 'back';

/**
 * The design system's links (docs/design-system/components/link.html): a native `<a href>` that
 * only takes people somewhere. `external` opens a new tab with `rel="noopener"`, the out-arrow
 * and the hidden words "(opens in a new tab)"; `current` marks the link to the current page with
 * `aria-current="page"`. Links have no disabled state. The label is projected as text; text links
 * grow to a 44 × 44 px target on coarse pointers.
 */
@Component({
  selector: 'cf-link',
  templateUrl: './link.html',
  styleUrl: './link.scss',
})
export class Link {
  readonly href = input.required<string>();
  readonly variant = input<LinkVariant>('inline');
  readonly external = input(false, { transform: booleanAttribute });
  readonly current = input(false, { transform: booleanAttribute });

  protected classes(): string {
    switch (this.variant()) {
      case 'text':
        return 'text-link';
      case 'quiet':
        return 'text-link text-link--quiet';
      case 'ui':
        return 'text-link text-link--ui';
      case 'back':
        return 'back-link';
      default:
        return 'link';
    }
  }
}
