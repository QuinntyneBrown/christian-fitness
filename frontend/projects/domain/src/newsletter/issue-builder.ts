import { inject, Injectable, type OnDestroy, signal } from '@angular/core';
import {
  ADMIN_NEWSLETTER_SERVICE,
  type ApiError,
  type DeskStoryDto,
  type IssueFieldsDto,
  type IssueStatusName,
  type NewsletterDeskDto,
  type NextIssueDto,
  type SentIssueDto,
} from '@cf/api';
import type { Subscription } from 'rxjs';
import { EVENT_TIME_ZONE } from '../events/event-when';
import { storyAge, storySectionLabel } from '../news/story-list';

/** "Also this week" holds at most three stories (L2-070 AC2). */
export const ISSUE_ALSO_MAX = 3;

/** How long after the last edit a Draft issue is saved (L2-070 AC14). */
export const ISSUE_AUTOSAVE_MS = 2_000;

/** An issue with nothing written or picked. */
export const BLANK_ISSUE: IssueFieldsDto = {
  subject: '',
  editorsNote: '',
  leadStoryId: null,
  alsoStoryIds: [],
  eventIds: [],
  verse: '',
  verseReference: '',
};

const whole = new Intl.NumberFormat('en-CA');
// Made once on first use, not at import: a formatter is costly to create.
let dayFormat: Intl.DateTimeFormat | undefined;
let clockFormat: Intl.DateTimeFormat | undefined;
let shortDay: Intl.DateTimeFormat | undefined;

function dayOf(instant: string): string {
  dayFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return dayFormat.format(new Date(instant)).replace(',', '');
}

function clockOf(instant: string): string {
  clockFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  return clockFormat.format(new Date(instant));
}

/** The heading's line (L2-070 AC1): "The Abundant Weekly · 6,800 subscribers · Every Saturday, 7 AM". */
export function issueSubtitle(name: string, confirmed: number): string {
  return `${name} · ${whole.format(confirmed)} ${confirmed === 1 ? 'subscriber' : 'subscribers'} · Every Saturday, 7 AM`;
}

/** The fields of an issue, without what else the desk says of it. */
export function issueFieldsOf(issue: NextIssueDto): IssueFieldsDto {
  return {
    subject: issue.subject,
    editorsNote: issue.editorsNote,
    leadStoryId: issue.leadStoryId,
    alsoStoryIds: [...issue.alsoStoryIds],
    eventIds: [...issue.eventIds],
    verse: issue.verse,
    verseReference: issue.verseReference,
  };
}

/** Whether nothing has been written or picked yet. */
export function issueIsBlank(fields: IssueFieldsDto): boolean {
  return (
    !fields.subject &&
    !fields.editorsNote &&
    !fields.leadStoryId &&
    fields.alsoStoryIds.length === 0 &&
    fields.eventIds.length === 0 &&
    !fields.verse &&
    !fields.verseReference
  );
}

/**
 * The stories ticked under "Also this week" when an issue is first built (L2-070 AC3): those
 * marked "Include in the Weekly", newest first as the desk lists them, until three are.
 */
export function preselectAlso(stories: readonly DeskStoryDto[]): string[] {
  return stories
    .filter((story) => story.includeInWeekly)
    .slice(0, ISSUE_ALSO_MAX)
    .map((story) => story.id);
}

/** "2 of 3" (L2-070 AC2). */
export function alsoCount(alsoStoryIds: readonly string[]): string {
  return `${alsoStoryIds.length} of ${ISSUE_ALSO_MAX}`;
}

/** Whether `id` can still be ticked: always when it is, and until three are (L2-070 AC2). */
export function canPickAlso(alsoStoryIds: readonly string[], id: string): boolean {
  return alsoStoryIds.includes(id) || alsoStoryIds.length < ISSUE_ALSO_MAX;
}

/** One "Also this week" row: the headline, "Community · 2 hours ago", ticked or unavailable. */
export interface AlsoRow {
  id: string;
  title: string;
  meta: string;
  checked: boolean;
  disabled: boolean;
}

/** The rows of "Also this week": every published story but the big one (L2-070 AC2). */
export function alsoRowsOf(
  stories: readonly DeskStoryDto[],
  fields: IssueFieldsDto,
  now: Date,
): AlsoRow[] {
  return stories
    .filter((story) => story.id !== fields.leadStoryId)
    .map((story) => ({
      id: story.id,
      title: story.headline,
      meta: [storySectionLabel(story.section), storyAge(story.publishedAt, now)]
        .filter((part) => part)
        .join(' · '),
      checked: fields.alsoStoryIds.includes(story.id),
      disabled: !canPickAlso(fields.alsoStoryIds, story.id),
    }));
}

/** What the send card says (L2-070 AC4, AC6, AC8). */
export interface SendCardView {
  label: 'Goes out' | 'Scheduled for' | 'Was due';
  /** "Sat Apr 18". */
  date: string;
  /** "7:00 AM Eastern · 6,800 people". */
  meta: string;
}

/** The send card of an issue going to `confirmed` people, its time in Eastern time. */
export function sendCardOf(
  issue: { status: IssueStatusName; sendAt: string; missedSend: boolean },
  confirmed: number,
): SendCardView {
  return {
    label: issue.missedSend
      ? 'Was due'
      : issue.status === 'scheduled'
        ? 'Scheduled for'
        : 'Goes out',
    date: dayOf(issue.sendAt),
    meta: `${clockOf(issue.sendAt)} Eastern · ${whole.format(confirmed)} ${confirmed === 1 ? 'person' : 'people'}`,
  };
}

/** "Saved 8:42 AM", in Eastern time (L2-070 AC14); empty before the first save. */
export function issueSavedText(savedAt: string | null): string {
  return savedAt ? `Saved ${clockOf(savedAt)}` : '';
}

/** A sent issue as its row reads: "#48", "Apr 11", the subject and "6,812" (L2-070 AC10). */
export interface SentIssueRow {
  id: string;
  number: string;
  date: string;
  subject: string;
  recipients: string;
}

export function sentIssueRowsOf(sent: readonly SentIssueDto[]): SentIssueRow[] {
  shortDay ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  });
  const day = shortDay;
  return sent.map((issue) => ({
    id: String(issue.number),
    number: `#${issue.number}`,
    date: day.format(new Date(issue.sentAt)),
    subject: issue.subject,
    recipients: whole.format(issue.recipients),
  }));
}

/** What each refused field says to add (L2-070 AC5, AC8); none for a code it does not know. */
const FIELD_ERRORS: Record<string, string> = {
  subject_required: 'Add a subject line before scheduling.',
  subject_too_long: 'Use 150 characters or fewer.',
  editors_note_required: "Add an editor's note before scheduling.",
  editors_note_too_long: 'Use 2,000 characters or fewer.',
  lead_story_required: 'Choose the big story before scheduling.',
  story_unavailable: 'A story chosen is no longer published. Choose another.',
  too_many_stories: 'Choose up to three more stories.',
  event_unavailable: 'An event chosen is no longer coming up. Choose again.',
  too_many_events: 'Choose up to four events.',
  verse_too_long: 'Use 400 characters or fewer.',
  verse_reference_too_long: 'Use 60 characters or fewer.',
  send_time_invalid: 'Choose a time later today.',
};

/** The words under a refused field, or none. */
export function issueFieldError(code: string | undefined): string | null {
  return code ? (FIELD_ERRORS[code] ?? null) : null;
}

/** Where the desk is: being read, ready, or not read. */
export type IssueDeskLoad = 'loading' | 'ready' | 'failed';

/** The schedule action: none under way, under way, refused for its fields, or failed. */
export type IssueBuilderState = 'idle' | 'scheduling' | 'unscheduling' | 'invalid' | 'failed';

/** "Send me a test": not asked, under way, sent, or failed. */
export type IssueTestState = 'idle' | 'sending' | 'sent' | 'failed';

/**
 * The Newsletter desk's state (L2-070): the desk as read, the next issue's fields as typed, its
 * status, and the action under way. A new issue has the stories marked "Include in the Weekly"
 * ticked. A Draft is saved {@link ISSUE_AUTOSAVE_MS} after the last edit, each edit restarting the
 * pause; a Scheduled issue is locked. Provided on the desk's page, so its timer and requests end
 * with the visit (AGENTS.md, "Release everything you acquire").
 */
@Injectable()
export class IssueBuilder implements OnDestroy {
  private readonly api = inject(ADMIN_NEWSLETTER_SERVICE);
  private readonly state = {
    load: signal<IssueDeskLoad>('loading'),
    desk: signal<NewsletterDeskDto | null>(null),
    issue: signal<NextIssueDto | null>(null),
    fields: signal<IssueFieldsDto>(BLANK_ISSUE),
    action: signal<IssueBuilderState>('idle'),
    fieldCodes: signal<Record<string, string>>({}),
    savedAt: signal<string | null>(null),
    saveFailed: signal(false),
    saving: signal(false),
    test: signal<IssueTestState>('idle'),
    testSentTo: signal<string | null>(null),
    sendTime: signal(''),
  };
  private timer: ReturnType<typeof setTimeout> | undefined;
  private reading: Subscription | undefined;
  private saveRun: Subscription | undefined;
  private acting: Subscription | undefined;
  private testing: Subscription | undefined;
  private inFlight = false;
  private editedSince = false;

  readonly load = this.state.load.asReadonly();
  readonly desk = this.state.desk.asReadonly();
  /** The next issue as last answered: its number, status, send time and whether it was missed. */
  readonly issue = this.state.issue.asReadonly();
  readonly fields = this.state.fields.asReadonly();
  readonly action = this.state.action.asReadonly();
  /** The fields Schedule refused, by their camel-case name, until each is edited (L2-070 AC5). */
  readonly fieldCodes = this.state.fieldCodes.asReadonly();
  readonly savedAt = this.state.savedAt.asReadonly();
  /** The last autosave did not reach the server; the fields are kept. */
  readonly saveFailed = this.state.saveFailed.asReadonly();
  /** A save is under way: "Saving…" (mock `autosaving`). */
  readonly saving = this.state.saving.asReadonly();
  readonly test = this.state.test.asReadonly();
  readonly testSentTo = this.state.testSentTo.asReadonly();
  /** A missed issue's new time today, `HH:mm` (L2-070 AC8). */
  readonly sendTime = this.state.sendTime.asReadonly();

  /** Whether the fields are locked: the issue is Scheduled, or an action is under way (L2-070 AC6). */
  locked(): boolean {
    const action = this.state.action();
    return (
      this.state.issue()?.status !== 'draft' || action === 'scheduling' || action === 'unscheduling'
    );
  }

  /** Reads the desk; again after it failed to load. */
  open(): void {
    this.reading?.unsubscribe();
    this.state.load.set('loading');
    this.reading = this.api.desk().subscribe({
      next: (desk) => {
        const fields = issueFieldsOf(desk.nextIssue);
        const fresh = desk.nextIssue.status === 'draft' && issueIsBlank(fields);
        this.state.desk.set(desk);
        this.state.issue.set(desk.nextIssue);
        this.state.fields.set(
          fresh ? { ...fields, alsoStoryIds: preselectAlso(desk.stories) } : fields,
        );
        this.state.load.set('ready');
      },
      error: () => this.state.load.set('failed'),
    });
  }

  /** Takes an edit; a Draft is saved once typing pauses. */
  edit(patch: Partial<IssueFieldsDto>): void {
    if (this.locked()) return;
    this.state.fields.update((fields) => {
      const next = { ...fields, ...patch };
      // The big story is never also one of the others.
      return patch.leadStoryId
        ? { ...next, alsoStoryIds: next.alsoStoryIds.filter((id) => id !== patch.leadStoryId) }
        : next;
    });
    this.unmark(...Object.keys(patch));
    if (this.state.test() !== 'sending') this.state.test.set('idle');
    if (this.inFlight) this.editedSince = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), ISSUE_AUTOSAVE_MS);
  }

  /** Ticks or unticks a story under "Also this week"; a fourth is not ticked (L2-070 AC2). */
  toggleAlso(id: string, checked: boolean): void {
    const also = this.state.fields().alsoStoryIds;
    if (checked ? !canPickAlso(also, id) || also.includes(id) : !also.includes(id)) return;
    this.edit({ alsoStoryIds: checked ? [...also, id] : also.filter((other) => other !== id) });
  }

  /** Features an event, or stops featuring it. */
  toggleEvent(id: string, pressed: boolean): void {
    const events = this.state.fields().eventIds.filter((other) => other !== id);
    this.edit({ eventIds: pressed ? [...events, id] : events });
  }

  /** A missed issue's new time today; a refusal of it is cleared. */
  chooseSendTime(time: string): void {
    this.state.sendTime.set(time);
    this.unmark('sendTime');
  }

  /**
   * "Schedule issue" (L2-070 AC5, AC6, AC8): sends the fields as typed, so no save is needed
   * first. An empty subject, big story or note is marked here and nothing is sent; a refusal marks
   * the fields the server names. `done` hears of a success.
   */
  schedule(done?: () => void): void {
    const issue = this.state.issue();
    if (!issue || this.locked()) return;
    const fields = this.state.fields();
    const missing: Record<string, string> = {};
    if (!fields.subject.trim()) missing['subject'] = 'subject_required';
    if (!fields.leadStoryId) missing['leadStoryId'] = 'lead_story_required';
    if (!fields.editorsNote.trim()) missing['editorsNote'] = 'editors_note_required';
    if (issue.missedSend && !this.state.sendTime()) missing['sendTime'] = 'send_time_invalid';
    if (Object.keys(missing).length > 0) {
      this.state.fieldCodes.set(missing);
      this.state.action.set('invalid');
      return;
    }
    clearTimeout(this.timer);
    this.timer = undefined;
    this.editedSince = false;
    this.state.fieldCodes.set({});
    this.state.action.set('scheduling');
    this.acting = this.api
      .schedule(issue.number, fields, issue.missedSend ? this.state.sendTime() : undefined)
      .subscribe({
        next: (scheduled) => {
          this.take(scheduled);
          done?.();
        },
        error: (error: ApiError) => {
          if (error?.code === 'validation_failed' && error.fieldCodes) {
            this.state.fieldCodes.set(error.fieldCodes);
            this.state.action.set('invalid');
          } else {
            this.state.action.set('failed');
          }
        },
      });
  }

  /** "Unschedule to edit" (L2-070 AC6): the issue is a Draft again. */
  unschedule(done?: () => void): void {
    const issue = this.state.issue();
    if (!issue || issue.status !== 'scheduled' || this.state.action() === 'unscheduling') return;
    this.state.action.set('unscheduling');
    this.acting = this.api.unschedule(issue.number).subscribe({
      next: (draft) => {
        this.take(draft);
        done?.();
      },
      error: () => this.state.action.set('failed'),
    });
  }

  /** "Send me a test" (L2-070 AC9): the issue as it stands, to the Admin's own address. */
  sendTest(): void {
    const issue = this.state.issue();
    if (!issue || this.state.test() === 'sending') return;
    this.state.test.set('sending');
    this.testing = this.api.sendTest(issue.number, this.state.fields()).subscribe({
      next: (sent) => {
        this.state.testSentTo.set(sent.sentTo);
        this.state.test.set('sent');
      },
      error: () => this.state.test.set('failed'),
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.reading?.unsubscribe();
    this.saveRun?.unsubscribe();
    this.acting?.unsubscribe();
    this.testing?.unsubscribe();
  }

  private take(issue: NextIssueDto): void {
    this.state.issue.set(issue);
    this.state.fields.set(issueFieldsOf(issue));
    this.state.action.set('idle');
    this.state.sendTime.set('');
  }

  private save(): void {
    this.timer = undefined;
    const issue = this.state.issue();
    if (!issue || issue.status !== 'draft') return;
    if (this.inFlight) {
      this.editedSince = true;
      return;
    }
    this.inFlight = true;
    this.state.saving.set(true);
    this.editedSince = false;
    this.saveRun = this.api.save(issue.number, this.state.fields()).subscribe({
      next: (saved) => {
        this.inFlight = false;
        this.state.saving.set(false);
        this.state.savedAt.set(saved.savedAt);
        this.state.saveFailed.set(false);
        if (this.editedSince && this.timer === undefined) this.save();
      },
      error: () => {
        this.inFlight = false;
        this.state.saving.set(false);
        this.state.saveFailed.set(true);
      },
    });
  }

  private unmark(...fields: string[]): void {
    const codes = this.state.fieldCodes();
    if (!fields.some((field) => field in codes)) return;
    const rest = Object.fromEntries(Object.entries(codes).filter(([key]) => !fields.includes(key)));
    this.state.fieldCodes.set(rest);
    if (Object.keys(rest).length === 0 && this.state.action() === 'invalid') {
      this.state.action.set('idle');
    }
  }
}
