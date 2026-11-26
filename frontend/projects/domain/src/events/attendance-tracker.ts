import { computed, inject, Injectable, type OnDestroy, signal } from '@angular/core';
import { ADMIN_EVENTS_SERVICE, type AttendanceRowDto, TOASTS_SERVICE } from '@cf/api';
import type { Subscription } from 'rxjs';

/** One Came box as the Attendance tab shows it: who, whether it is ticked, and whether its change is saving. */
export interface AttendanceRowState {
  memberId: string;
  name: string;
  came: boolean;
  busy: boolean;
}

/** What the failure toast says after its title (L2-080 AC3; mock `admin-event-attendance/failed`). */
export const ATTENDANCE_FAILED_TEXT = 'Their box is back as it was. Try again.';

/** The failure toast's title, naming the member: "We couldn't save <name>". */
export function attendanceFailedTitle(name: string): string {
  return `We couldn't save ${name}`;
}

/**
 * The Came boxes of one event (L2-080 AC2, AC3; ADR 0106). A tick shows at once, marks the box busy
 * and saves it through `ADMIN_EVENTS_SERVICE`; nothing waits for a Save button. One request per
 * member is in flight: a tick on a busy box is shown at once and saved when the first answers, so
 * the last tick wins. A failure puts the box back to the last value saved and shows "We couldn't
 * save <name>" through the screen's `TOASTS_SERVICE`; no other box changes. `saving` names the
 * member most recently ticked whose change is still saving. Provided on the routed component of
 * the Attendance tab, so its requests end with the visit.
 */
@Injectable()
export class AttendanceTracker implements OnDestroy {
  private readonly events = inject(ADMIN_EVENTS_SERVICE);
  private readonly toasts = inject(TOASTS_SERVICE);
  private readonly shown = signal<readonly AttendanceRowState[]>([]);
  private readonly ticked = signal<readonly string[]>([]);
  private readonly saved = new Map<string, boolean>();
  private readonly requests = new Map<string, Subscription>();
  private eventId = '';

  readonly rows = this.shown.asReadonly();
  /** How many boxes are ticked now. */
  readonly came = computed(() => this.shown().filter((row) => row.came).length);
  /** The name of the member most recently ticked whose change is saving, or none. */
  readonly saving = computed(() => {
    const busy = new Set(
      this.shown()
        .filter((row) => row.busy)
        .map((row) => row.memberId),
    );
    const last = [...this.ticked()].reverse().find((id) => busy.has(id));
    return last === undefined ? null : (this.find(last)?.name ?? null);
  });

  /** Shows the event's registered members as the server answered, dropping anything in flight. */
  load(eventId: string, items: readonly AttendanceRowDto[]): void {
    this.cancel();
    this.eventId = eventId;
    this.saved.clear();
    for (const item of items) this.saved.set(item.memberId, item.came);
    this.ticked.set([]);
    this.shown.set(
      items.map(({ memberId, name, came }) => ({ memberId, name, came, busy: false })),
    );
  }

  /** Ticks or clears the box of `memberId` and saves it. */
  tick(memberId: string, came: boolean): void {
    const row = this.find(memberId);
    if (!row || row.came === came) return;
    this.ticked.update((ids) => [...ids.filter((id) => id !== memberId), memberId]);
    this.set(memberId, { came });
    if (!row.busy) this.save(memberId);
  }

  ngOnDestroy(): void {
    this.cancel();
  }

  private save(memberId: string): void {
    const came = this.find(memberId)?.came ?? false;
    this.set(memberId, { busy: true });
    const request = this.events.setAttendance(this.eventId, memberId, came).subscribe({
      next: () => {
        this.requests.delete(memberId);
        this.saved.set(memberId, came);
        // A tick made while this one saved is saved now; the last tick wins.
        if (this.find(memberId)?.came !== came) this.save(memberId);
        else this.set(memberId, { busy: false });
      },
      error: () => {
        this.requests.delete(memberId);
        const row = this.find(memberId);
        this.set(memberId, { came: this.saved.get(memberId) ?? false, busy: false });
        if (row) this.toasts.show(attendanceFailedTitle(row.name), ATTENDANCE_FAILED_TEXT);
      },
    });
    if (!request.closed) this.requests.set(memberId, request);
  }

  private find(memberId: string): AttendanceRowState | undefined {
    return this.shown().find((row) => row.memberId === memberId);
  }

  private set(memberId: string, change: Partial<AttendanceRowState>): void {
    this.shown.update((rows) =>
      rows.map((row) => (row.memberId === memberId ? { ...row, ...change } : row)),
    );
  }

  private cancel(): void {
    for (const request of this.requests.values()) request.unsubscribe();
    this.requests.clear();
  }
}
