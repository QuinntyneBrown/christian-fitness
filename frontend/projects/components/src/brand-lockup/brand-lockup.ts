import { booleanAttribute, Component, input } from '@angular/core';
import { Seal } from './seal';

/**
 * The design system's brand lockup (docs/design-system/components/brand-lockup.html): the seal
 * beside the wordmark in condensed italic capitals, as the home link of the top bar and site
 * header. The wordmark names the link "Christian Fitness" and the seal is decorative. `light` is
 * the variant for bordeaux panels and dark chrome, with the matching focus ring. It never shrinks
 * or drops its wordmark, and is 44 px tall as a link.
 */
@Component({
  selector: 'cf-brand-lockup',
  imports: [Seal],
  templateUrl: './brand-lockup.html',
  styleUrl: './brand-lockup.scss',
})
export class BrandLockup {
  readonly href = input.required<string>();
  readonly light = input(false, { transform: booleanAttribute });
}
