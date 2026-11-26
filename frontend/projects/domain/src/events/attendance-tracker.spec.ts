import { TestBed } from '@angular/core/testing';
import { ADMIN_EVENTS_SERVICE, type AdminEventsApi, TOASTS_SERVICE } from '@cf/api';
import { Subject } from 'rxjs';
import {
  ATTENDANCE_FAILED_TEXT,
  attendanceFailedTitle,
  AttendanceTracker,
  type AttendanceRowState,
} from './attendance-tracker';

// L2-080 AC2 and AC3 (ADR 0106): a tick shows at once, is busy while it saves and saves itself; a
// failure puts the box back with a toast naming the member; the last tick wins; other boxes stay.
describe('AttendanceTracker', () => {
  let answers: Subject<void>[];
  let sent: string[];
  let toasts: [string, string][];
  let tracker: AttendanceTracker;

  beforeEach(() => {
    answers = [];
    sent = [];
    toasts = [];
    const events: Partial<AdminEventsApi> = {
      setAttendance: (eventId: string, memberId: string, came: boolean) => {
        sent.push(`${eventId} ${memberId} ${came}`);
        const reply = new Subject<void>();
        answers.push(reply);
        return reply;
      },
    };
    TestBed.configureTestingModule({
      providers: [
        AttendanceTracker,
        { provide: ADMIN_EVENTS_SERVICE, useValue: events },
        {
          provide: TOASTS_SERVICE,
          useValue: { show: (title: string, text: string) => toasts.push([title, text]) },
        },
      ],
    });
    tracker = TestBed.inject(AttendanceTracker);
    tracker.load('e1', [
      { memberId: 'grace', name: 'Grace Thompson', came: true },
      { memberId: 'hannah', name: 'Hannah Kim', came: false },
    ]);
  });

  const row = (memberId: string): AttendanceRowState | undefined =>
    tracker.rows().find((r) => r.memberId === memberId);
  const succeed = (n: number): void => {
    answers[n].next();
    answers[n].complete();
  };
  const fail = (n: number): void => answers[n].error(new Error('offline'));

  it('shows each registered member as loaded, none busy, and counts those who came', () => {
    expect(tracker.rows()).toEqual([
      { memberId: 'grace', name: 'Grace Thompson', came: true, busy: false },
      { memberId: 'hannah', name: 'Hannah Kim', came: false, busy: false },
    ]);
    expect([tracker.came(), tracker.saving()]).toEqual([1, null]);
  });

  // One row per outcome of a tick: shown at once and busy, then settled by the answer.
  it.each<{
    what: string;
    memberId: string;
    came: boolean;
    settle: (n: number) => void;
    after: boolean;
    count: number;
    toast: [string, string][];
  }>([
    {
      what: 'a tick that saves stays ticked',
      memberId: 'hannah',
      came: true,
      settle: (n) => succeed(n),
      after: true,
      count: 2,
      toast: [],
    },
    {
      what: 'a clear that saves stays cleared',
      memberId: 'grace',
      came: false,
      settle: (n) => succeed(n),
      after: false,
      count: 0,
      toast: [],
    },
    {
      what: 'a tick that fails goes back, with a toast',
      memberId: 'hannah',
      came: true,
      settle: (n) => fail(n),
      after: false,
      count: 1,
      toast: [[attendanceFailedTitle('Hannah Kim'), ATTENDANCE_FAILED_TEXT]],
    },
    {
      what: 'a clear that fails goes back, with a toast',
      memberId: 'grace',
      came: false,
      settle: (n) => fail(n),
      after: true,
      count: 1,
      toast: [[attendanceFailedTitle('Grace Thompson'), ATTENDANCE_FAILED_TEXT]],
    },
  ])('$what', ({ memberId, came, settle, after, count, toast }) => {
    tracker.tick(memberId, came);

    expect(row(memberId)).toMatchObject({ came, busy: true });
    expect(sent).toEqual([`e1 ${memberId} ${came}`]);
    expect(tracker.saving()).toBe(row(memberId)?.name);
    settle(0);
    expect(row(memberId)).toMatchObject({ came: after, busy: false });
    expect([tracker.came(), tracker.saving()]).toEqual([count, null]);
    expect(toasts).toEqual(toast);
  });

  it('names the toast "We couldn\'t save <name>" and says the box is back', () => {
    expect(attendanceFailedTitle('Hannah Kim')).toBe("We couldn't save Hannah Kim");
    expect(ATTENDANCE_FAILED_TEXT).toBe('Their box is back as it was. Try again.');
  });

  it('leaves the other boxes alone while one saves and when it fails', () => {
    tracker.tick('hannah', true);
    tracker.tick('grace', false);

    expect(row('grace')).toMatchObject({ came: false, busy: true });
    expect(tracker.saving()).toBe('Grace Thompson');
    fail(0);
    expect(row('hannah')).toMatchObject({ came: false, busy: false });
    expect(row('grace')).toMatchObject({ came: false, busy: true });
    expect(tracker.saving()).toBe('Grace Thompson');
    succeed(1);
    expect(row('grace')).toMatchObject({ came: false, busy: false });
  });

  it('saves a tick made while the box is busy once the first answers, so the last tick wins', () => {
    tracker.tick('hannah', true);
    tracker.tick('hannah', false);

    expect(row('hannah')).toMatchObject({ came: false, busy: true });
    expect(sent).toEqual(['e1 hannah true']);
    succeed(0);
    expect(sent).toEqual(['e1 hannah true', 'e1 hannah false']);
    expect(row('hannah')).toMatchObject({ came: false, busy: true });
    succeed(1);
    expect(row('hannah')).toMatchObject({ came: false, busy: false });
  });

  it('puts a failed later tick back to the value last saved', () => {
    tracker.tick('hannah', true);
    tracker.tick('hannah', false);
    succeed(0);
    fail(1);

    expect(row('hannah')).toMatchObject({ came: true, busy: false });
  });

  it('puts a box whose save failed back to the value last saved, whatever it was ticked to since', () => {
    tracker.tick('hannah', true);
    tracker.tick('hannah', false);
    fail(0);

    expect(row('hannah')).toMatchObject({ came: false, busy: false });
    expect(sent).toEqual(['e1 hannah true']);
  });

  it('sends nothing for a box set to what it shows, or for someone not listed', () => {
    tracker.tick('grace', true);
    tracker.tick('nobody', true);

    expect(sent).toEqual([]);
  });

  it('drops what is in flight when the page is left', () => {
    tracker.tick('hannah', true);

    tracker.ngOnDestroy();

    expect(answers[0].observed).toBe(false);
  });
});
