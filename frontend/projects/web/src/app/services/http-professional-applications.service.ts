import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApplicationDto, ProfessionalApplicationsApi, SubmitApplicationDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link ProfessionalApplicationsApi} over HTTP: `POST /api/professional-applications` (ADR 0047).
 * A failed send errors with an `ApiError`. It holds no state, and is provided on the Services
 * screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpProfessionalApplicationsService implements ProfessionalApplicationsApi {
  private readonly http = inject(HttpClient);

  submit(application: SubmitApplicationDto): Observable<ApplicationDto> {
    return this.http
      .post<ApplicationDto>('/api/professional-applications', application)
      .pipe(
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
          ),
        ),
      );
  }
}
