import { booleanAttribute, Component, computed, input } from '@angular/core';
import { Seal } from './seal';

/**
 * The design system's brand lockup (docs/design-system/components/brand-lockup.html): the seal
 * beside the wordmark in condensed italic capitals, as the home link of the top bar and site
 * header. The wordmark names the link "Christian Fitness" and the seal is decorative. `light` is
 * the variant for bordeaux panels and dark chrome, with the matching focus ring. `compact` is the
 * variant for the member top bar: below 28rem the wordmark is visually hidden but still names the
 * link, and the seal stands alone in a 44 × 44 px target (ADR 0084). Otherwise the lockup never
 * shrinks or drops its wordmark, and is 44 px tall as a link.
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
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() => {
    const classes = ['lockup'];
    if (this.light()) classes.push('lockup--light');
    if (this.compact()) classes.push('lockup--compact');
    return classes.join(' ');
  });
}
