import { Component, input } from '@angular/core';

/** The graphic's shape: a 1080 × 1080 square, a 1080 × 1920 story or a 1200 × 630 link image. */
export type PickArtShape = 'square' | 'story' | 'landscape';

/**
 * The design system's pick art (docs/design-system/components/pick-art.html, block `pick-art`):
 * the Community Pick graphic in a box of its shape, one `role="img"` named by `label` so its text
 * is not read twice. With `rendered` (a PNG's object URL) it shows that image, the graphic as it
 * will be posted; without, it draws the graphic in HTML as a preview: the photo (or, with no
 * `photoSrc`, the brand pattern, `pick-art--pattern`), the brand shade, the "Community Pick"
 * label, the title, the when line and the note. Every text is text.
 */
@Component({
  selector: 'cf-pick-art',
  templateUrl: './pick-art.html',
  styleUrl: './pick-art.scss',
})
export class PickArt {
  readonly shape = input<PickArtShape>('square');
  /** "Community Pick graphic: Easter Sunrise 5K, Sat Apr 18". */
  readonly label = input.required<string>();
  readonly title = input('');
  readonly when = input('');
  readonly note = input('');
  /** The event's photo for the preview; none draws the brand pattern. */
  readonly photoSrc = input<string | null>(null);
  /** The rendered PNG to show instead of the preview. */
  readonly rendered = input<string | null>(null);

  protected artClass(): string {
    const base = `pick-art pick-art--${this.shape()}`;
    return this.rendered() === null && this.photoSrc() === null
      ? `${base} pick-art--pattern`
      : base;
  }
}
