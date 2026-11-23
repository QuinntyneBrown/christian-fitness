import { booleanAttribute, Component, input, output } from '@angular/core';

/**
 * One item of the design system's accordion (docs/design-system/components/accordion.html): a
 * native `<details>` whose `<summary>` is the whole, at least 48 px tall toggle, so keyboard,
 * the expanded state and find-in-page work without script. The indicator is decorative and turns
 * when open (not under reduced motion). The body is projected. `open` sets the starting state and
 * `toggled` reports each change.
 */
@Component({
  selector: 'cf-accordion-item',
  templateUrl: './accordion-item.html',
  styleUrl: './accordion-item.scss',
})
export class AccordionItem {
  /** The question or heading; its text is the item's name. */
  readonly summary = input.required<string>();
  readonly open = input(false, { transform: booleanAttribute });

  readonly toggled = output<boolean>();

  protected toggle(event: Event): void {
    this.toggled.emit((event.target as HTMLDetailsElement).open);
  }
}
