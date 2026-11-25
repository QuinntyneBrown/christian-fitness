import { booleanAttribute, Component, input } from '@angular/core';

/** The exact box of the part a skeleton stands in for (skeleton.html, "Code"). */
export type SkeletonShape =
  | 'text'
  | 'text-sm'
  | 'title'
  | 'title-lg'
  | 'avatar'
  | 'avatar-xl'
  | 'avatar-2xl'
  | 'avatar-profile'
  | 'date'
  | 'button'
  | 'button-block'
  | 'chip'
  | 'bubble'
  | 'tile'
  | 'stat'
  | 'block'
  | 'image-16x8'
  | 'image-16x9'
  | 'image-banner';

/** Line widths, so lines vary (`.w-40` … `.w-90`). */
export type SkeletonWidth = '10' | '20' | '30' | '40' | '50' | '55' | '80' | '90';

/**
 * One shape of the design system's skeleton (docs/design-system/components/skeleton.html): an
 * empty, decorative placeholder the size of the content it stands in for, with a shimmer that
 * stops under reduced motion. It has no content, no role and is hidden from assistive technology;
 * the `cf-skeleton-region` around it names what is loading.
 */
@Component({
  selector: 'cf-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
})
export class Skeleton {
  readonly shape = input<SkeletonShape>('text');
  readonly width = input<SkeletonWidth>();
  /** A rounded square instead of a circle, for a squared mark such as a listing's (`skeleton--square`). */
  readonly square = input(false, { transform: booleanAttribute });

  protected classes(): string {
    const width = this.width();
    return `skeleton skeleton--${this.shape()}${this.square() ? ' skeleton--square' : ''}${width ? ` w-${width}` : ''}`;
  }
}
