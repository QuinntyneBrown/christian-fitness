import { type AfterViewInit, Component, ElementRef, inject, input, output } from '@angular/core';

/** One filter: its label, its URL and an optional count that helps people decide. */
export interface TabItem {
  label: string;
  href: string;
  count?: number;
}

/**
 * The design system's tabs (docs/design-system/components/tabs.html): navigation tabs under an
 * admin page head, a labelled `<nav>` of links, not an ARIA tablist, since each tab loads a URL.
 * The `current` one is `aria-current="page"`, shown by the underline and a darker label so colour
 * is not the only signal; a count is plain text inside the link, zero too, so the set never jumps.
 * The row scrolls sideways when it does not fit, and the current tab is scrolled into view on
 * load. A plain click (the main button, no modifier key) is not followed but emits `navigate` with
 * the `href`, so the app moves without reloading. Labels are rendered as text.
 */
@Component({
  selector: 'cf-tabs',
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
})
export class Tabs implements AfterViewInit {
  /** Names what is filtered, such as "Filter events". */
  readonly label = input.required<string>();
  readonly tabs = input.required<readonly TabItem[]>();
  /** The `href` of the filter showing. */
  readonly current = input<string>();

  readonly navigate = output<string>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  ngAfterViewInit(): void {
    this.host.nativeElement
      .querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  protected follow(event: MouseEvent, href: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.navigate.emit(href);
  }
}
