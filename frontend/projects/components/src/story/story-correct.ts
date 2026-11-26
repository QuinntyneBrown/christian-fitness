import { Component, input, output } from '@angular/core';
import { Link } from '../link/link';
import { isPlainClick } from '../link/plain-click';

/**
 * "Spotted a mistake? Send a correction" at the end of the design system's story (element
 * `story__correct`; L2-061 AC5, L2-063 AC2), leading to `href`. A plain click on an address inside
 * the app (`/…`) emits `navigate` with it; any other click is the browser's. Part of `cf-story`, in
 * its own stylesheet.
 */
@Component({
  selector: 'cf-story-correct',
  imports: [Link],
  templateUrl: './story-correct.html',
  styleUrl: './story-correct.scss',
})
export class StoryCorrect {
  readonly href = input.required<string>();
  readonly navigate = output<string>();

  protected follow(event: MouseEvent): void {
    const href = this.href();
    if (!href.startsWith('/') || href.startsWith('//') || !isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
