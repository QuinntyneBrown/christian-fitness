import { booleanAttribute, Component, computed, input } from '@angular/core';

/**
 * The design system's seal sizes: the two small ones (`lockup`, `signin`) drop the ring lettering,
 * the two large ones (`verse`, `hero`) carry it.
 */
export type SealSize = 'lockup' | 'signin' | 'verse' | 'hero';

let nextSeal = 0;

/**
 * The design system's seal (docs/design-system/components/brand-lockup.html): a bordeaux cross in
 * a ring, with "Christian Fitness · Health · Energy · Abundant life" around it at the large sizes.
 * Alone it is an image named "Christian Fitness"; inside the lockup it is `decorative` and hidden
 * from assistive technology. `light` puts it on bordeaux or dark chrome, the cross turning gold.
 * Each lettered seal draws its text along a path with an id of its own, so two seals on a page never
 * share one.
 */
@Component({
  selector: 'cf-seal',
  templateUrl: './seal.html',
  styleUrl: './seal.scss',
})
export class Seal {
  readonly size = input<SealSize>('lockup');
  readonly light = input(false, { transform: booleanAttribute });
  readonly decorative = input(false, { transform: booleanAttribute });

  protected readonly pathId = `cf-seal-${nextSeal++}`;

  protected readonly lettered = computed(() => this.size() === 'verse' || this.size() === 'hero');

  protected classes(): string {
    return `seal seal--${this.size()}${this.light() ? ' seal--light' : ''}`;
  }
}
