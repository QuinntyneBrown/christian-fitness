import { DOCUMENT } from '@angular/common';
import { Component, inject, input } from '@angular/core';

/**
 * The design system's skip link (docs/design-system/components/skip-link.html): the first focusable
 * element of every page, "Skip to content", off screen until it has focus, then a bordeaux pill in
 * the top-left corner above the sticky header. Activating it moves focus to the element whose id is
 * `target` (`main` by default) without loading the page again, since `<base href="/">` would
 * resolve `#main` against `/`. A target that cannot take focus gets `tabindex="-1"` first.
 */
@Component({
  selector: 'cf-skip-link',
  templateUrl: './skip-link.html',
  styleUrl: './skip-link.scss',
})
export class SkipLink {
  /** The id of the element to skip to: the page's one `main`. */
  readonly target = input('main');

  private readonly document = inject(DOCUMENT);

  protected skip(event: Event): void {
    event.preventDefault();
    const target = this.document.getElementById(this.target());
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus();
  }
}
