import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminNewsletterApi,
  IssueDto,
  IssueFieldsDto,
  IssueSavedDto,
  NewsletterDeskDto,
  NextIssueDto,
  TestSentDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

const PATH = '/api/admin/newsletter';

/**
 * {@link AdminNewsletterApi} over HTTP: `/api/admin/newsletter` (L2-070). A failure errors with an
 * `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpAdminNewsletterService implements AdminNewsletterApi {
  private readonly http = inject(HttpClient);

  desk(): Observable<NewsletterDeskDto> {
    return this.http.get<NewsletterDeskDto>(PATH).pipe(catchError(asApiError));
  }

  save(number: number, fields: IssueFieldsDto): Observable<IssueSavedDto> {
    return this.http
      .put<IssueSavedDto>(`${PATH}/issues/${number}`, fields)
      .pipe(catchError(asApiError));
  }

  schedule(number: number, fields: IssueFieldsDto, sendTime?: string): Observable<NextIssueDto> {
    return this.http
      .post<NextIssueDto>(
        `${PATH}/issues/${number}/schedule`,
        sendTime ? { ...fields, sendTime } : fields,
      )
      .pipe(catchError(asApiError));
  }

  unschedule(number: number): Observable<NextIssueDto> {
    return this.http
      .post<NextIssueDto>(`${PATH}/issues/${number}/unschedule`, null)
      .pipe(catchError(asApiError));
  }

  sendTest(number: number, fields: IssueFieldsDto): Observable<TestSentDto> {
    return this.http
      .post<TestSentDto>(`${PATH}/issues/${number}/test`, fields)
      .pipe(catchError(asApiError));
  }

  preview(number: number): Observable<IssueDto> {
    return this.http.get<IssueDto>(`${PATH}/issues/${number}/preview`).pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
