import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  FeedsApi,
  FeedSummaryDto,
  NewsletterApi,
  SubscribeRequest,
  SubscriptionConfirmedDto,
  UnsubscribedDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, map, throwError, type Observable } from 'rxjs';

/** Passes a failure on as an `ApiError`. */
function asApiError<T>(source: Observable<T>): Observable<T> {
  return source.pipe(
    catchError((error: unknown) =>
      throwError(() =>
        error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
      ),
    ),
  );
}

/**
 * {@link NewsletterApi} over HTTP: `POST /api/public/newsletter/subscriptions`, `/confirmations`
 * and `/unsubscriptions` (ADR 0110). The token goes in the body, never the address. A failure
 * errors with an `ApiError`. It holds no state, and is provided on Subscribe, so it lives only
 * while Subscribe does.
 */
@Injectable()
export class HttpNewsletterService implements NewsletterApi {
  private readonly http = inject(HttpClient);

  subscribe(request: SubscribeRequest): Observable<void> {
    return asApiError(
      this.http.post('/api/public/newsletter/subscriptions', request).pipe(map(() => undefined)),
    );
  }

  confirm(token: string): Observable<SubscriptionConfirmedDto> {
    return asApiError(
      this.http.post<SubscriptionConfirmedDto>('/api/public/newsletter/confirmations', { token }),
    );
  }

  unsubscribe(token: string): Observable<UnsubscribedDto> {
    return asApiError(
      this.http.post<UnsubscribedDto>('/api/public/newsletter/unsubscriptions', { token }),
    );
  }
}

/**
 * {@link FeedsApi} over HTTP: `GET /api/public/feeds` (ADR 0110). A failure passes on to
 * Subscribe, which shows no feed list. It holds no state, and is provided on Subscribe.
 */
@Injectable()
export class HttpFeedsService implements FeedsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<FeedSummaryDto[]> {
    return this.http.get<FeedSummaryDto[]>('/api/public/feeds');
  }
}
