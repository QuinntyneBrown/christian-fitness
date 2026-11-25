import { Component, input } from '@angular/core';
import { Status } from '../badge/status';

/** Where a session stands, as the API decides it (ADR 0091). */
export type AdminSessionRowState = 'done' | 'live' | 'upcoming' | 'cancelled';

/** One row: its number, its date as read ("Tue Apr 21"), its topic (or empty) and its state. */
export interface AdminSessionRow {
  id: string;
  number: string;
  date: string;
  topic: string;
  state: AdminSessionRowState;
}

/**
 * The design system's admin sessions (docs/design-system/components/session-list.html, blocks
 * `admin-sessions` and `admin-session`): a series' dates as an ordered list card, each row its
 * number (hidden from assistive technology, which reads the list's order), date and topic, and an
 * end that says its state in words: "Done" for a past one (the row muted), "Live" for the next
 * one, "Cancelled" for a cancelled one (its topic struck through, never the only cue), nothing for
 * the rest. Rows are not focusable; topics are rendered as text.
 */
@Component({
  selector: 'cf-admin-sessions',
  imports: [Status],
  templateUrl: './admin-sessions.html',
  styleUrl: './admin-sessions.scss',
})
export class AdminSessions {
  readonly sessions = input.required<readonly AdminSessionRow[]>();

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
}
