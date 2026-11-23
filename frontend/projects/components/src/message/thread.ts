import { type AfterViewChecked, Component, ElementRef, inject, input, output } from '@angular/core';

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
 */
@Component({
  selector: 'cf-thread',
  templateUrl: './thread.html',
  styleUrl: './thread.scss',
})
export class Thread implements AfterViewChecked {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private shown = 0;

  /** The conversation's name, such as "Sunrise 5K Crew". */
  readonly label = input.required<string>();
  readonly entries = input.required<readonly ThreadEntry[]>();

  readonly retry = output<string>();

  /** Scrolls to the newest message whenever the thread has grown (mock: data-scroll-end). */
  ngAfterViewChecked(): void {
    const count = this.entries().length;
    if (count === this.shown) return;
    this.shown = count;
    const list = this.host.nativeElement.querySelector('.thread__messages');
    if (list) list.scrollTop = list.scrollHeight;
  }

  protected classes(message: ThreadMessage): string {
    return `message${message.mine ? ' message--mine' : ''}${message.failed ? ' message--failed' : ''}`;
  }
}
