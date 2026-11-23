import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';

/** The card's padding (card.html, "Variants"); the list card is a variant of `cf-list`. */
export type CardVariant = 'pad' | 'pad-sm' | 'clip' | 'plain';

/** The element that fits the content (card.html, "Accessibility"). */
export type CardElement = 'div' | 'article' | 'section';

/**
 * The design system's card (docs/design-system/components/card.html): a surface panel with a
 * hairline edge and large corners that holds content and never acts; its controls do. It renders
 * the element that fits (`article` or `section` labelled by its heading through `labelledBy`, or a
 * plain `div`), adds no role and is never focusable. Content is projected once, whatever the
 * element. The list card (`card--list`) is `cf-list` with `variant="card"`, whose rows are its own
 * list items (ADR 0017).
 */
@Component({
  selector: 'cf-card',
  imports: [NgTemplateOutlet],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {
  readonly variant = input<CardVariant>('pad');
  readonly element = input<CardElement>('div');
  /** The id of the heading that names an `article` or `section`. */
  readonly labelledBy = input<string>();

  protected classes(): string {
    const variant = this.variant();
    return variant === 'plain' ? 'card' : `card card--${variant}`;
  }
}
