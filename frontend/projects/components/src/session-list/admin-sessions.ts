import { Component, input, output } from '@angular/core';
import { Status } from '../badge/status';
import { Button } from '../button/button';

/** Where a session stands, as the API decides it (ADR 0091). */
export type AdminSessionRowState = 'done' | 'live' | 'upcoming' | 'cancelled';

/** What a row offers: Cancel date, Restore, or nothing (ADR 0103). */
export type AdminSessionRowAction = 'cancel' | 'restore' | null;

/**
 * One row: its number, its date as read ("Tue Apr 21"), its topic (or empty), its state, what it
 * offers and the name its action carries for assistive technology ("session 3, Tue Apr 21").
 */
export interface AdminSessionRow {
  id: string;
  number: string;
  date: string;
  topic: string;
  state: AdminSessionRowState;
  action: AdminSessionRowAction;
  name: string;
}

/**
 * The design system's admin sessions (docs/design-system/components/session-list.html, blocks
 * `admin-sessions` and `admin-session`): a series' dates as an ordered list card, each row its
 * number (hidden from assistive technology, which reads the list's order), date and topic, and an
 * end that says its state in words: "Done" for a past one (the row muted), "Live" for the next
 * one, "Cancelled" for a cancelled one (its topic struck through, never the only cue), nothing for
 * the rest. A row not started offers "Cancel date" (a quiet link) or, cancelled, "Restore", each
 * named with its session for assistive technology; the row keeps one button whose words change, so
 * focus stays on it after a cancel or restore (ADR 0103). The row named by `restoring` reads
 * "Restoring…" and is busy. Rows are not focusable; topics are rendered as text.
 */
@Component({
  selector: 'cf-admin-sessions',
  imports: [Button, Status],
  templateUrl: './admin-sessions.html',
  styleUrl: './admin-sessions.scss',
})
export class AdminSessions {
  readonly sessions = input.required<readonly AdminSessionRow[]>();
  /** The id of the row whose Restore is on its way, or none. */
  readonly restoring = input<string | null>(null);
  /** "Cancel date" was pressed on the row with this id. */
  readonly cancelDate = output<string>();
  /** "Restore" was pressed on the row with this id. */
  readonly restoreDate = output<string>();

  protected classOf(state: AdminSessionRowState): string {
    switch (state) {
      case 'done':
        return 'admin-session admin-session--past';
      case 'cancelled':
        return 'admin-session admin-session--cancelled';
      default:
        return 'admin-session';
    }
  }

  protected wordsOf(session: AdminSessionRow): string {
    if (session.action === 'cancel') return 'Cancel date';
    return session.id === this.restoring() ? 'Restoring…' : 'Restore';
  }

  /** ": session 3, Tue Apr 21" after Cancel date, " session 6, Tue May 12" after Restore (the mock's). */
  protected hiddenOf(session: AdminSessionRow): string {
    return session.action === 'cancel' ? `: ${session.name}` : ` ${session.name}`;
  }

  protected act(session: AdminSessionRow): void {
    if (session.action === 'cancel') this.cancelDate.emit(session.id);
    else if (session.action === 'restore') this.restoreDate.emit(session.id);
  }
}
