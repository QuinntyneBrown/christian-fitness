import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  type OnChanges,
  output,
  type SimpleChanges,
} from '@angular/core';
import { Button } from '../button/button';

/** One feed as the list shows it (L2-060 AC4). */
export interface FeedListItem {
  /** "All stories", or the section's name. */
  name: string;
  /** The feed's address. */
  url: string;
  /** About how many stories it carries a week, as words: "~20 a week". */
  count: string;
  /** Where "Open in Feedly" leads. */
  feedlyHref: string;
  /** All stories: first, on the blush fill (`feed--all`). */
  isAll: boolean;
}

/**
 * The design system's feed list (docs/design-system/components/feed-list.html; blocks `rss`,
 * `feed-list`, `feed`): Subscribe's "Prefer RSS?" section, its title and text, then one row per
 * feed with its rate, its address in one truncated line, a fixed-width "Copy URL" and "Open in
 * Feedly" in a new tab (L2-060 AC4; ADR 0110). "Copy URL" emits `copyRequested` with the address;
 * `copiedUrl` makes that row's button read "Copied" and the status say "Feed address copied". With
 * `selectedUrl` (the clipboard refused) that row's address is selected for the reader to copy.
 * Every name and address is rendered as text.
 */
@Component({
  selector: 'cf-feed-list',
  imports: [Button],
  templateUrl: './feed-list.html',
  styleUrl: './feed-list.scss',
})
export class FeedList implements OnChanges {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly feeds = input<readonly FeedListItem[]>([]);
  /** The feed whose "Copy URL" reads "Copied"; none reads "Copy URL" everywhere. */
  readonly copiedUrl = input<string | null>(null);
  /** The feed whose address is shown selected because the clipboard refused; none selects nothing. */
  readonly selectedUrl = input<string | null>(null);

  /** "Copy URL" was pressed, with the feed's address. */
  readonly copyRequested = output<string>();

  ngOnChanges(changes: SimpleChanges): void {
    const url = this.selectedUrl();
    if (changes['selectedUrl'] && url) {
      afterNextRender(
        () => {
          const index = this.feeds().findIndex((feed) => feed.url === url);
          const address = this.host.nativeElement.querySelectorAll('.feed__url').item(index);
          if (index >= 0 && address) this.document.getSelection()?.selectAllChildren(address);
        },
        { injector: this.injector },
      );
    }
  }
}
