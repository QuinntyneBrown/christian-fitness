import { Component, computed, input } from '@angular/core';

/** The mark's sizes: the button's (`lg` icon), a line of text's (`sm`) and an avatar's (`xl`). */
export type GoogleMarkSize = 'md' | 'sm' | 'xl';

/**
 * Google's full-colour G (docs/design-system/components/google-button.html, `google-g`), bundled
 * with the app as inline SVG: no image, script or font is ever loaded from Google (L2-049 AC9). Its
 * colours are Google's own and belong to the mark, not to the theme. Decorative: the words beside
 * it carry the meaning.
 */
@Component({
  selector: 'cf-google-mark',
  templateUrl: './google-mark.html',
  styleUrl: './google-mark.scss',
})
export class GoogleMark {
  readonly size = input<GoogleMarkSize>('md');

  protected readonly classes = computed(() =>
    this.size() === 'md' ? 'google-g' : `google-g google-g--${this.size()}`,
  );
}
