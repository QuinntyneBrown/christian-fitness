import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { IssueDto } from '../news/newsletter';
import type { StorySectionName } from './admin-stories';

/** Where the next issue stands: being built, or locked to go out at its time (L2-070 AC1, AC6). */
export type IssueStatusName = 'draft' | 'scheduled';

/** What an Admin writes and picks for an issue (L2-070 AC2). */
export interface IssueFieldsDto {
  subject: string;
  editorsNote: string;
  /** "The big story": a published story, or none chosen yet. */
  leadStoryId: string | null;
  /** "Also this week": at most three more published stories. */
  alsoStoryIds: string[];
  /** "Events this week": which of the next four events to feature. */
  eventIds: string[];
  verse: string;
  verseReference: string;
}

/** The issue the desk builds: its number, status and send time, its fields, and whether its time passed unscheduled (L2-070 AC8). */
export interface NextIssueDto extends IssueFieldsDto {
  number: number;
  status: IssueStatusName;
  sendAt: string;
  missedSend: boolean;
}

/** A published story the issue may carry, and whether it is marked "Include in the Weekly" (L2-070 AC3). */
export interface DeskStoryDto {
  id: string;
  headline: string;
  section: StorySectionName | null;
  publishedAt: string;
  includeInWeekly: boolean;
}

/** One of the next four published upcoming events (L2-070 AC2). */
export interface DeskEventDto {
  id: string;
  title: string;
  startsAt: string;
}

/** A sent issue: its number, when, its subject and how many people it went to (L2-070 AC10). */
export interface SentIssueDto {
  number: number;
  sentAt: string;
  subject: string;
  recipients: number;
}

/** `GET /api/admin/newsletter` (L2-070 AC1, AC2, AC10): stories newest first, events soonest first, sent issues newest first. */
export interface NewsletterDeskDto {
  name: string;
  confirmedSubscribers: number;
  /** When the next issue goes out. */
  sendsAt: string;
  nextIssue: NextIssueDto;
  stories: DeskStoryDto[];
  events: DeskEventDto[];
  sent: SentIssueDto[];
}

/** What a save answers: when, for "Saved {time}" (L2-070 AC14). */
export interface IssueSavedDto {
  savedAt: string;
}

/** What "Send me a test" answers: the address it went to (L2-070 AC9). */
export interface TestSentDto {
  sentTo: string;
}

/**
 * The Newsletter desk's API (`/api/admin/newsletter`; L2-070). A failure errors with an `ApiError`:
 * `schedule` is refused `validation_failed` with `fieldCodes` (`subject_required`,
 * `editors_note_required`, `lead_story_required`, `story_unavailable`, `event_unavailable`,
 * `send_time_invalid`); `save`, `schedule` and `unschedule` are refused `status_conflict` for an
 * issue in another status. `sendTime` is a missed issue's new time today in Toronto, `HH:mm`.
 */
export interface AdminNewsletterApi {
  desk(): Observable<NewsletterDeskDto>;
  save(number: number, fields: IssueFieldsDto): Observable<IssueSavedDto>;
  schedule(number: number, fields: IssueFieldsDto, sendTime?: string): Observable<NextIssueDto>;
  unschedule(number: number): Observable<NextIssueDto>;
  sendTest(number: number, fields: IssueFieldsDto): Observable<TestSentDto>;
  preview(number: number): Observable<IssueDto>;
}

export const ADMIN_NEWSLETTER_SERVICE = new InjectionToken<AdminNewsletterApi>(
  'ADMIN_NEWSLETTER_SERVICE',
);
