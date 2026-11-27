import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminFeedbackApi,
  FeedbackListDto,
  FeedbackNoteDto,
  FeedbackRepliedDto,
  FeedbackStatusName,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

const PATH = '/api/admin/feedback';

/**
 * {@link AdminFeedbackApi} over HTTP: `/api/admin/feedback` (L2-074). A failure errors with an
 * `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpAdminFeedbackService implements AdminFeedbackApi {
  private readonly http = inject(HttpClient);

  list(status: FeedbackStatusName | null): Observable<FeedbackListDto> {
    return this.http
      .get<FeedbackListDto>(PATH, { params: status ? { status } : {} })
      .pipe(catchError(asApiError));
  }

  note(id: string): Observable<FeedbackNoteDto> {
    return this.http
      .get<FeedbackNoteDto>(`${PATH}/${encodeURIComponent(id)}`)
      .pipe(catchError(asApiError));
  }

  reply(id: string, text: string): Observable<FeedbackRepliedDto> {
    return this.http
      .post<FeedbackRepliedDto>(`${PATH}/${encodeURIComponent(id)}/replies`, { text })
      .pipe(catchError(asApiError));
  }

  resolve(id: string): Observable<{ status: FeedbackStatusName }> {
    return this.http
      .post<{ status: FeedbackStatusName }>(`${PATH}/${encodeURIComponent(id)}/resolve`, null)
      .pipe(catchError(asApiError));
  }

  reopen(id: string): Observable<{ status: FeedbackStatusName }> {
    return this.http
      .post<{ status: FeedbackStatusName }>(`${PATH}/${encodeURIComponent(id)}/reopen`, null)
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
