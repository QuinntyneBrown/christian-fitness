import { Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { PickArt, type PickArtShape } from './pick-art';

/**
 * The design system's asset (docs/design-system/components/pick-art.html, block `asset`): one
 * Community Pick graphic as made (`src`, a PNG's object URL) in its `pick-art` box, with its size
 * label ("Post · 1080 × 1080") and a "PNG" button whose visually hidden text names the file.
 * Pressing it emits `save`; the page downloads the file.
 */
@Component({
  selector: 'cf-pick-asset',
  imports: [Button, PickArt],
  templateUrl: './pick-asset.html',
  styleUrl: './pick-asset.scss',
})
export class PickAsset {
  readonly shape = input<PickArtShape>('square');
  /** The graphic's name for assistive technology: "Community Pick graphic: Easter Sunrise 5K, Sat Apr 18". */
  readonly artLabel = input.required<string>();
  readonly src = input.required<string>();
  /** "Post · 1080 × 1080". */
  readonly label = input.required<string>();
  /** "community-pick-easter-sunrise-5k-instagram-post.png". */
  readonly fileName = input.required<string>();
  readonly save = output<void>();
}
