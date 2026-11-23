import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';

/**
 * The design system's empty and error forms (docs/design-system/components/empty-state.html):
 * `page` (first run or no results, 64 px under the page header), `tight` (16 px under filters or
 * tabs), `card` (one empty section of a busy page), `inline` (a small empty list in a section)
 * and `error` (the data did not load: an icon, a reference and `role="alert"`).
 */
export type EmptyStateVariant = 'page' | 'tight' | 'card' | 'inline' | 'error';

/**
 * The design system's empty state (docs/design-system/components/empty-state.html): what will
 * appear and the way to make it appear, or why the data did not load. The title is a real `h2`,
 * or a `p` when it restates a filter result (`headingTag`). One primary and at most one secondary
 * action are projected through `[slot=actions]`, once for every variant. A load error is announced
 * once and carries a `reference` for support as plain text. Focus is never moved here on load.
 * Words are rendered as text.
 */
@Component({
  selector: 'cf-empty-state',
  imports: [NgTemplateOutlet],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly variant = input<EmptyStateVariant>('page');
  readonly heading = input.required<string>();
  readonly text = input<string>();
  readonly headingTag = input<'h2' | 'p'>('h2');
  /** A load error's reference, such as "CF-A2E4". */
  readonly reference = input<string>();

  /** The inline sentence: the heading, then the text if there is one. */
  protected inlineText(): string {
    const text = this.text();
    return text ? `${this.heading()} ${text}` : this.heading();
  }

  /** The title's classes: the card's own block for a card, the empty state's otherwise. */
  protected titleClass(): string {
    return this.variant() === 'card' ? 'display empty-card__title' : 'display empty-state__title';
  }
}
