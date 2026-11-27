import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** A subscription to The Abundant Weekly: an email and nothing else (L2-057; ADR 0110). */
export interface SubscribeRequest {
  email: string;
}

/** What a followed confirmation link answers (L2-058 AC2): the address and its first issue's instant. */
export interface SubscriptionConfirmedDto {
  email: string;
  firstIssueAt: string;
}

/** What a followed Unsubscribe link answers (L2-058 AC5): the address, or none once it is purged. */
export interface UnsubscribedDto {
  email: string | null;
}

/**
 * The newsletter for anyone, with no account (L2-057, L2-058; ADR 0110). `subscribe` completes with
 * nothing on 202, whatever the address's standing; `confirm` fails with `subscription_link_expired`
 * for a link that cannot confirm; `unsubscribe` never refuses. Every failure is an `ApiError`.
 */
export interface NewsletterApi {
  subscribe(request: SubscribeRequest): Observable<void>;
  confirm(token: string): Observable<SubscriptionConfirmedDto>;
  unsubscribe(token: string): Observable<UnsubscribedDto>;
}

/** Binds {@link NewsletterApi}; Subscribe provides it on its own route component. */
export const NEWSLETTER_SERVICE = new InjectionToken<NewsletterApi>('NEWSLETTER_SERVICE');

/** One RSS feed as Subscribe lists it (L2-060 AC4; ADR 0110): All stories first. */
export interface FeedSummaryDto {
  name: string;
  /** The feed's absolute address. */
  url: string;
  /** About how many stories it carries a week. */
  storiesPerWeek: number;
  /** All stories, which comes first and stands out. */
  isAll: boolean;
}

/** The feeds, from `GET /api/public/feeds` (L2-060 AC4). */
export interface FeedsApi {
  list(): Observable<FeedSummaryDto[]>;
}

/** Binds {@link FeedsApi}; Subscribe provides it on its own route component. */
export const FEEDS_SERVICE = new InjectionToken<FeedsApi>('FEEDS_SERVICE');

/** A story in an issue: where it leads, its section, headline, summary, byline and image (L2-059 AC1). */
export interface IssueStoryDto {
  slug: string;
  section: string | null;
  headline: string;
  summary: string;
  author: string | null;
  image: { key: string; crop: { x: number; y: number; width: number; height: number } } | null;
}

/** An event on an issue's calendar (L2-059 AC1). The price is in cents. */
export interface IssueEventDto {
  id: string;
  title: string;
  startsAt: string;
  area: string;
  priceCents: number;
}

/**
 * An issue as the web shows it (`GET /api/public/newsletter/issues/latest` or `/{number}`; L2-059
 * AC1): the same for every reader, so it names nobody. `date` is when it went, or goes, out.
 */
export interface IssueDto {
  number: number;
  date: string;
  name: string;
  editorsNote: string;
  lead: IssueStoryDto | null;
  briefs: IssueStoryDto[];
  events: IssueEventDto[];
  verse: string;
  verseReference: string;
}

/**
 * The sent issues for anyone (L2-059; `GET /api/public/newsletter/issues/latest` and `/{number}`).
 * `issue(null)` is the latest. Nothing sent, an unknown number or an issue not yet sent fails with
 * `not_found`; every failure is an `ApiError`.
 */
export interface IssuesApi {
  issue(number: number | null): Observable<IssueDto>;
}

/** Binds {@link IssuesApi}; the Newsletter page provides it on its own route component. */
export const ISSUES_SERVICE = new InjectionToken<IssuesApi>('ISSUES_SERVICE');
