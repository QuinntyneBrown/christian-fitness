import { Component, input, output } from '@angular/core';
import { HostingRow } from './hosting-row';

/** One row the Hosting list shows: the screen words it (L2-055 AC2). */
export interface HostingItem {
  id: string;
  href: string;
  imageSrc: string;
  meta: string;
  title: string;
  sub: string;
  series?: boolean;
}

/**
 * The design system's Hosting list (docs/design-system/components/host-card.html, "Hosting",
 * block `hosting`): a listing's series and one-off events as `hosting-row`s, or, with none, the
 * one sentence `empty` says (`hosting__empty`). A row's plain click is passed on as `navigate`.
 * Words are rendered as text.
 */
@Component({
  selector: 'cf-hosting',
  imports: [HostingRow],
  templateUrl: './hosting.html',
  styleUrl: './hosting.scss',
})
export class Hosting {
  readonly rows = input.required<readonly HostingItem[]>();
  /** "<name> isn't hosting anything right now. Follow to hear when they post a date." */
  readonly empty = input.required<string>();
  readonly navigate = output<string>();
}
