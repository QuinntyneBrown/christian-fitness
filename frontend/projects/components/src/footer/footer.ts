import { Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/**
 * The design system's site footer (docs/design-system/components/footer.html): two quiet lines at
 * the bottom of a public page, "© 2026 Christian Fitness · Toronto" and the seal's words
 * "Health · Energy · Abundant life", stacked on phones and on one row from 640 px. It is a
 * `<footer>` outside `main`, so it is the page's one `contentinfo` landmark; the screen places it
 * after its `main`. The `news` variant closes the news front page with the copyright and its links:
 * RSS with its mark, which leads to the All stories feed until Subscribe exists, Privacy and Terms
 * (L2-001 AC9, L2-060; ADR 0108). The `member` variant closes every scrolling member page; its
 * Send feedback goes to `feedbackHref`, which names the page the member is on (ADR 0109), and a
 * plain click on it is handed to the app as `navigate`.
 */
@Component({
  selector: 'cf-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  /** The copyright year; this year unless the screen says otherwise. */
  readonly variant = input<'site' | 'news' | 'member'>('site');
  readonly year = input(new Date().getFullYear());
  /** Where the member footer's Send feedback goes, with the page it is about. */
  readonly feedbackHref = input('/feedback');

  /** A plain click on Send feedback, with its `feedbackHref`. */
  readonly navigate = output<string>();

  protected followFeedback(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.feedbackHref());
  }
}
