import { Component } from '@angular/core';

/**
 * The design system's verified mark (docs/design-system/components/listing-row.html, block
 * `verified-mark`): the badge-check icon after a listing's name, named "Verified" for assistive
 * technology (`role="img"`), so the state never rests on the icon or its colour alone.
 */
@Component({
  selector: 'cf-verified-mark',
  templateUrl: './verified-mark.html',
  styleUrl: './verified-mark.scss',
})
export class VerifiedMark {}
