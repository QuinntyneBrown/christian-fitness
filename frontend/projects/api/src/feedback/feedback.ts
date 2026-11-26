import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** What a note is about (L2-063 AC3; ADR 0109): Idea, Something's off, Correction or Thanks. */
export type FeedbackKind = 'idea' | 'problem' | 'correction' | 'thanks';

/**
 * What the Send feedback form needs from `GET /api/feedback/form?about=…` (ADR 0109): the
 * member's address, which the email choice names, and the "About this page" label the server
 * gave the `about` it knows, else `null`. Both are plain text, never rendered as HTML.
 */
export interface FeedbackFormDto {
  email: string;
  about: { label: string } | null;
}

/**
 * A note as `POST /api/feedback` takes it, as `multipart/form-data` (ADR 0109): the kind, the
 * text, what it is about (`page:<route template>` or `story:<id>`, `null` when the member removed
 * it) and whether the team may email the member about it.
 */
export interface SendFeedbackDto {
  kind: FeedbackKind;
  text: string;
  about: string | null;
  mayEmail: boolean;
}

/** Sending the team feedback (L2-063; ADR 0109). */
export interface FeedbackApi {
  /** The form for the signed-in member, about `about` (`page:…` or `story:…`) when given. */
  form(about: string | null): Observable<FeedbackFormDto>;
  /**
   * Sends the note, with one screenshot for Something's off (AC4, AC6). A refusal or no answer
   * errors with an `ApiError`: 400 `validation_failed` with one `fieldCodes` entry (AC4, AC8), 429
   * `too_many_attempts` (AC9), status 0 for none.
   */
  send(note: SendFeedbackDto, screenshot: File | null): Observable<void>;
}

/** Binds {@link FeedbackApi}; the Send feedback screen provides it on its own route component. */
export const FEEDBACK_SERVICE = new InjectionToken<FeedbackApi>('FEEDBACK_SERVICE');
