import { booleanAttribute, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Checkbox } from '../checkbox/checkbox';
import { isPlainClick } from '../link/plain-click';
import { Skeleton } from '../skeleton/skeleton';

/** Where a date stands for the member's row: past, the next one, still to come, or cancelled. */
export type SessionRowState = 'past' | 'next' | 'upcoming' | 'cancelled';

/**
 * What a row ends with (design system "End"): `details`, a link to the session's event page named
 * "Details of session <n>"; `status`, a state in plain words ("Done", "Not recorded",
 * "Cancelled", "Full"); `pick`, a "Drop in" tick box whose hidden words complete its name
 * (" on Sat, Apr 25"; ADR 0102); or nothing.
 */
export type SessionRowEnd =
  | { kind: 'details'; href: string; number: number }
  | { kind: 'status'; text: string }
  | { kind: 'pick'; label: string; hidden: string; value: string; checked: boolean }
  | null;

/** A tick box was ticked or unticked: the session's id (the box's value) and whether it is ticked. */
export interface SessionTick {
  value: string;
  checked: boolean;
}

/** One date as its row shows it; the screen words it. */
export interface SessionListRow {
  id: string;
  /** "Apr" and "07" in the date tile (hidden from assistive technology). */
  month: string;
  day: string;
  /** "Session 3 · Tue". */
  meta: string;
  /** ", Apr 21": the date again, in visually hidden text. */
  date: string;
  state: SessionRowState;
  /** What the session is about, or empty. */
  topic: string;
  end: SessionRowEnd;
  /** " · Registered" or " · Not going" after the weekday (ADR 0102); none or empty for no mark. */
  mark?: string;
}

/**
 * The design system's session list (docs/design-system/components/session-list.html, blocks
 * `session-list` and `session-row`): a series' dates as an ordered list, each with a date tile
 * (decorative; the date is repeated in hidden text), "Session <n> · <weekday>", "· Next up" on
 * the next one, the topic, and an end chosen by data, so each end is declared once (ADR 0096).
 * The state is a row modifier (`--past`, `--next`, `--cancelled`) and is also said in words.
 * Rows are not focusable; a plain click on Details emits `navigate` for the app's router, and a
 * tick box emits `tick` (the design system's compact checkbox). With `loading` it shows four
 * skeleton rows. Words are rendered as text.
 */
@Component({
  selector: 'cf-session-list',
  imports: [Button, Checkbox, Skeleton],
  templateUrl: './session-list.html',
  styleUrl: './session-list.scss',
})
export class SessionList {
  readonly sessions = input<readonly SessionListRow[]>([]);
  readonly loading = input(false, { transform: booleanAttribute });
  readonly navigate = output<string>();
  readonly tick = output<SessionTick>();

  protected readonly skeletons = [1, 2, 3, 4];

  protected classOf(state: SessionRowState): string {
    return state === 'upcoming' ? 'session-row' : `session-row session-row--${state}`;
  }

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
