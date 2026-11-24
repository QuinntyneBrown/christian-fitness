import {
  type AfterViewChecked,
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

/** A day separator: "Today", "Yesterday", "Mon, Apr 13". */
export interface ThreadDay {
  kind: 'day';
  id: string;
  label: string;
}

/** One message. My own carry no author; a failed one of mine can be sent again. */
export interface ThreadMessage {
  kind: 'message';
  id: string;
  text: string;
  time: string;
  /** The author, in group chats only. */
  author?: string;
  mine?: boolean;
  failed?: boolean;
}

export type ThreadEntry = ThreadDay | ThreadMessage;

/**
 * The design system's message thread (docs/design-system/components/message.html): an ordered
 * list in a labelled section, with day separators, received bubbles on the left (with the author
 * in group chats) and mine on the right. A failed message of mine fades, keeps its text and adds
 * an alert, "Not sent." with "Try again", which emits `retry` with its id. New messages are
 * announced by the real-time client's own live region, not by each bubble. The screen passes a
 * bounded window of entries. Message text is rendered as text, never as HTML.
 *
 * With `earlier` set, an "Earlier messages" button sits above the oldest message and scrolling to
 * the top asks the same, both emitting `loadEarlier` (L2-016 AC6); `loadingEarlier` disables the
 * button meanwhile. When earlier messages join the top the reader keeps their place; a new message
 * at the end scrolls to it.
 *
 * A message from another member carries a "Report" button that emits `report` with its id (L2-017;
 * slice 25.1; ADR 0000); my own messages and failed ones do not.
 */
@Component({
  selector: 'cf-thread',
  templateUrl: './thread.html',
  styleUrl: './thread.scss',
})
export class Thread implements AfterViewChecked {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private shown = 0;
  private lastId: string | undefined;
  private height = 0;

  /** The conversation's name, such as "Sunrise 5K Crew". */
  readonly label = input.required<string>();
  readonly entries = input.required<readonly ThreadEntry[]>();
  /** Whether earlier messages can be loaded. */
  readonly earlier = input(false, { transform: booleanAttribute });
  /** Whether a page of earlier messages is loading. */
  readonly loadingEarlier = input(false, { transform: booleanAttribute });

  readonly retry = output<string>();
  /** A received message's Report was pressed: emits its id (L2-017; ADR 0058). */
  readonly report = output<string>();
  readonly loadEarlier = output<void>();

  /**
   * Scrolls to the newest message when one arrives at the end (mock: data-scroll-end); when the
   * thread grew at the top instead, moves by the height added so the reader stays where they were.
   */
  ngAfterViewChecked(): void {
    const list = this.host.nativeElement.querySelector('.thread__messages');
    if (!list) return;
    const entries = this.entries();
    const lastId = entries.at(-1)?.id;
    if (entries.length !== this.shown || lastId !== this.lastId) {
      const grewAtTop = this.shown > 0 && lastId === this.lastId && entries.length > this.shown;
      list.scrollTop = grewAtTop
        ? list.scrollTop + list.scrollHeight - this.height
        : list.scrollHeight;
      this.shown = entries.length;
      this.lastId = lastId;
    }
    this.height = list.scrollHeight;
  }

  /** Asks for earlier messages when the reader reaches the top. */
  protected scrolled(event: Event): void {
    if (this.earlier() && !this.loadingEarlier() && (event.target as HTMLElement).scrollTop < 8) {
      this.loadEarlier.emit();
    }
  }

  protected classes(message: ThreadMessage): string {
    return `message${message.mine ? ' message--mine' : ''}${message.failed ? ' message--failed' : ''}`;
  }
}
