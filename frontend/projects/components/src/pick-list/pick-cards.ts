import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/**
 * One pick card: what it chooses, its title, its meta line or lines ("Organization · Listed") and
 * an optional tag ("Approved"). With an `href` it is a link to the record it opens.
 */
export interface PickCardItem {
  id: string;
  title: string;
  meta: string | readonly string[];
  href?: string;
  tag?: string;
  /** A count under the meta in the accent, such as "31 / 40 joined" (ADR 0091). */
  count?: string;
}

/**
 * The design system's pick cards (docs/design-system/components/pick-list.html, blocks
 * `pick-cards` and `pick-card`) in both its forms. Cards with an `href` are links in a `nav` named
 * by `label` that choose the record a page shows, the one whose id is `current` marked
 * `aria-current="page"` (ADR 0090); a plain click is not followed but emits `picked`, so the app
 * moves without reloading. Cards without one are buttons in a list named by `label` that choose a
 * value inside a form (ADR 0089). `light` is the listing suggestions' variant (a ring when current),
 * and `stack` keeps the cards stacked at every width; otherwise they scroll sideways below 1024px.
 * Every text is rendered as text.
 */
@Component({
  selector: 'cf-pick-cards',
  imports: [NgTemplateOutlet],
  templateUrl: './pick-cards.html',
  styleUrl: './pick-cards.scss',
})
export class PickCards {
  /** Names what is chosen, such as "Suggestions" or "Matching hosts". */
  readonly label = input.required<string>();
  readonly items = input.required<readonly PickCardItem[]>();
  /** The id of the record showing, for the link form. */
  readonly current = input<string | null>(null);
  readonly light = input(false, { transform: booleanAttribute });
  readonly stack = input(false, { transform: booleanAttribute });

  /** The id of the card chosen: a button pressed, or a link followed by a plain click. */
  readonly picked = output<string>();

  protected readonly links = computed(() => this.items().some((item) => item.href !== undefined));

  protected listClass(): string {
    return this.stack() ? 'pick-cards pick-cards--stack' : 'pick-cards';
  }

  protected cardClass(): string {
    return this.light() ? 'pick-card pick-card--light' : 'pick-card';
  }

  protected linesOf(item: PickCardItem): readonly string[] {
    return typeof item.meta === 'string' ? [item.meta] : item.meta;
  }

  protected follow(event: MouseEvent, item: PickCardItem): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.picked.emit(item.id);
  }
}
