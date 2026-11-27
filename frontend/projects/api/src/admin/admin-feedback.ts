import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { FeedbackKind } from '../feedback/feedback';

/** Where a note stands (L2-074 AC2): New until staff act, Replied once a reply has gone, Resolved once marked so. */
export type FeedbackStatusName = 'new' | 'replied' | 'resolved';

/** One note as its row reads (L2-074 AC1). */
export interface FeedbackRowDto {
  id: string;
  kind: FeedbackKind;
  sender: string;
  sentAt: string;
  /** The start of its text. */
  excerpt: string;
  status: FeedbackStatusName;
}

/** How many notes each tab holds (L2-074 AC2). */
export interface FeedbackCountsDto {
  all: number;
  new: number;
  replied: number;
  resolved: number;
}

/** `GET /api/admin/feedback?status=`: the notes of a status, or all, newest first, and every tab's count. */
export interface FeedbackListDto {
  counts: FeedbackCountsDto;
  items: FeedbackRowDto[];
}

/** A reply kept with a note: its text, when, and the staff member who wrote it. */
export interface FeedbackReplyDto {
  text: string;
  sentAt: string;
  by: string;
}

/** `GET /api/admin/feedback/{id}`: one note in full (L2-074 AC3). */
export interface FeedbackNoteDto {
  id: string;
  kind: FeedbackKind;
  status: FeedbackStatusName;
  sentAt: string;
  text: string;
  sender: { name: string; email: string; suspended: boolean };
  /** The page it was sent from: its route template and its title, either of which may be missing. */
  page: { routeTemplate: string | null; title: string | null };
  /** The story a correction is about, or none. */
  storyId: string | null;
  /** The OS family, such as "iOS". */
  device: string;
  /** The browser family and major version, such as "Safari 18". */
  browser: string;
  hasScreenshot: boolean;
  mayEmail: boolean;
  replies: FeedbackReplyDto[];
}

/** What a reply answers: the note's status, how the reply went and the reply kept. */
export interface FeedbackRepliedDto {
  status: FeedbackStatusName;
  deliveredBy: 'email' | 'message';
  reply: FeedbackReplyDto;
}

/** The address a note's screenshot is served from, to a staff session only (L2-074 AC8). */
export function feedbackScreenshotUrl(id: string): string {
  return `/api/admin/feedback/${encodeURIComponent(id)}/screenshot`;
}

/**
 * The feedback inbox's API (`/api/admin/feedback`; L2-074). A failure errors with an `ApiError`:
 * `reply` is refused `validation_failed` (`fieldCodes.text`: `reply_required`, `reply_too_long`),
 * `member_unreachable` or `member_deleting`; `resolve` and `reopen` are refused `status_conflict`.
 */
export interface AdminFeedbackApi {
  list(status: FeedbackStatusName | null): Observable<FeedbackListDto>;
  note(id: string): Observable<FeedbackNoteDto>;
  reply(id: string, text: string): Observable<FeedbackRepliedDto>;
  resolve(id: string): Observable<{ status: FeedbackStatusName }>;
  reopen(id: string): Observable<{ status: FeedbackStatusName }>;
}

export const ADMIN_FEEDBACK_SERVICE = new InjectionToken<AdminFeedbackApi>(
  'ADMIN_FEEDBACK_SERVICE',
);
