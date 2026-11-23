import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminMemberDto,
  AdminMemberListDto,
  AdminMemberQuery,
  AdminMembersApi,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link AdminMembersApi} over HTTP: `GET /api/admin/members` (ADR 0022) and
 * `POST /api/admin/members/{id}/flag` and `/suspend` (ADR 0025). The list sends the status
 * always, the search only when there is one and the page only past the first; a suspension is
 * sent as confirmed, since the dialog sends it only once staff confirmed. A failure errors
 * with an `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds no
 * state.
 */
@Injectable()
export class HttpAdminMembersService implements AdminMembersApi {
  private readonly http = inject(HttpClient);

  search(query: AdminMemberQuery): Observable<AdminMemberListDto> {
    const params: Record<string, string> = { status: query.status };
    if (query.q) params['q'] = query.q;
    if (query.page > 1) params['page'] = String(query.page);
    return this.http
      .get<AdminMemberListDto>('/api/admin/members', { params })
      .pipe(catchError(asApiError));
  }

  flag(id: string, note: string): Observable<AdminMemberDto> {
    return this.http
      .post<AdminMemberDto>(`/api/admin/members/${encodeURIComponent(id)}/flag`, { note })
      .pipe(catchError(asApiError));
  }

  suspend(id: string, note: string): Observable<AdminMemberDto> {
    return this.http
      .post<AdminMemberDto>(`/api/admin/members/${encodeURIComponent(id)}/suspend`, {
        note,
        confirmed: true,
      })
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
