import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/** One step of the trail: the page's own title and where it is. */
export interface BreadcrumbItem {
  label: string;
  href: string;
}

/**
 * The design system's breadcrumb (docs/design-system/components/breadcrumb.html), for pages two or
 * more levels deep: a `nav` labelled "Breadcrumb" around an ordered list of links, the last one the
 * current page with `aria-current="page"`, and separators drawn by CSS so they are never read. With
 * `collapsible`, below 768 px only a "← Parent" link to the item before the last shows, its arrow
 * hidden. A plain click on a link emits `navigate` with its `href`; a modified click is the
 * browser's. Labels are rendered as text.
 */
@Component({
  selector: 'cf-breadcrumb',
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
})
export class Breadcrumb {
  /** The trail from the top, the current page last. */
  readonly items = input.required<readonly BreadcrumbItem[]>();
  readonly collapsible = input(false, { transform: booleanAttribute });

  /** A plain click on a link, with its `href`. */
  readonly navigate = output<string>();

  /** The page one level up, which the collapsed trail links to. */
  protected readonly parent = computed(() => {
    const items = this.items();
    return items.length > 1 ? items[items.length - 2] : null;
  });

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
