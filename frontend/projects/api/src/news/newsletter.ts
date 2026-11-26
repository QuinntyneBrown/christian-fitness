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
