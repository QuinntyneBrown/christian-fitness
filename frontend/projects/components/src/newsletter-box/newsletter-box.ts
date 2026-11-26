import { Component, output, signal } from '@angular/core';
import { Button } from '../button/button';
import { Link } from '../link/link';
import { isPlainClick } from '../link/plain-click';

/**
 * The design system's newsletter box (docs/design-system/components/newsletter-box.html, block
 * `newsletter-box`): the front page rail's call to The Abundant Weekly, a 4px ink frame with the
 * newsletter's name, one line, an email field and "Subscribe free", and a quiet "Or follow by RSS"
 * (L2-057 AC1; ADR 0110). It has only the field and button states: "Subscribe free" hands the typed
 * email to the page, which opens Subscribe with it, where it is checked and confirmed. A plain
 * click on "Or follow by RSS" is handed to the page too, so it opens Subscribe's feeds in the app;
 * a modified click is left to the browser.
 */
@Component({
  selector: 'cf-newsletter-box',
  imports: [Button, Link],
  templateUrl: './newsletter-box.html',
  styleUrl: './newsletter-box.scss',
})
export class NewsletterBox {
  /** Where "Or follow by RSS" leads. */
  readonly rssHref = '/subscribe#rss';

  protected readonly email = signal('');

  /** "Subscribe free" was pressed, with the email as typed. */
  readonly subscribeChosen = output<string>();
  /** A plain click on "Or follow by RSS". */
  readonly rssChosen = output();

  protected edit(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected send(event: Event): void {
    event.preventDefault();
    this.subscribeChosen.emit(this.email());
  }

  protected followRss(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.rssChosen.emit();
  }
}
