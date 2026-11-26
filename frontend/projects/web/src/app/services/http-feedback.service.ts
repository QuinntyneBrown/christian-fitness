import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { FeedbackApi, FeedbackFormDto, SendFeedbackDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, type Observable, throwError } from 'rxjs';

/**
 * {@link FeedbackApi} over HTTP (ADR 0109): `GET /api/feedback/form` and `POST /api/feedback` as
 * `multipart/form-data`, the screenshot as its one file part. A failed request errors with an
 * `ApiError`. It holds no state, and is provided on the Send feedback screen, so it lives only
 * while the screen does.
 */
@Injectable()
export class HttpFeedbackService implements FeedbackApi {
  private readonly http = inject(HttpClient);

  form(about: string | null): Observable<FeedbackFormDto> {
    return this.http
      .get<FeedbackFormDto>('/api/feedback/form', { params: about === null ? {} : { about } })
      .pipe(catchError(refused));
  }

  send(note: SendFeedbackDto, screenshot: File | null): Observable<void> {
    const body = new FormData();
    body.append('kind', note.kind);
    body.append('text', note.text);
    if (note.about !== null) body.append('about', note.about);
    body.append('mayEmail', String(note.mayEmail));
    if (screenshot) body.append('screenshot', screenshot, screenshot.name);
    return this.http.post<void>('/api/feedback', body).pipe(catchError(refused));
  }
}

function refused(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
