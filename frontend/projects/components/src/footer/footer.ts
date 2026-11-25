import { Component, input } from '@angular/core';

/**
 * The design system's site footer (docs/design-system/components/footer.html): two quiet lines at
 * the bottom of a public page, "© 2026 Christian Fitness · Toronto" and the seal's words
 * "Health · Energy · Abundant life", stacked on phones and on one row from 640 px. It is a
 * `<footer>` outside `main`, so it is the page's one `contentinfo` landmark; the screen places it
 * after its `main`. Member and admin screens have none.
 */
@Component({
  selector: 'cf-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  /** The copyright year; this year unless the screen says otherwise. */
  readonly variant = input<'site' | 'member'>('site');
  readonly year = input(new Date().getFullYear());
}
