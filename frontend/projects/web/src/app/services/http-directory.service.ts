import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  DirectoryApi,
  DirectoryPageDto,
  DirectoryQuery,
  ListingConversationDto,
  ListingFollowDto,
  ListingProfileDto,
  OwnListingPhotoDto,
  OwnListingSavedDto,
  OwnListingUpdateDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, type Observable, throwError } from 'rxjs';

/**
 * {@link DirectoryApi} over HTTP: `GET /api/directory?kind=&q=&cursor=` (ADR 0082) and
 * `GET /api/directory/{id}` and `POST /api/directory/{id}/conversation` (ADR 0087) and
 * `PUT` and `DELETE /api/directory/{id}/follow` (ADR 0088) and the owner's `PUT /api/directory/{id}`
 * and `POST /api/directory/photos` (ADR 0095), whose refusals error with an `ApiError`. A 5xx opens
 * the server-error screen through the interceptor; every failure passes on to the screen. It holds
 * no state, and is provided on the Directory screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpDirectoryService implements DirectoryApi {
  private readonly http = inject(HttpClient);

  list(query: DirectoryQuery): Observable<DirectoryPageDto> {
    let params = new HttpParams();
    if (query.kind !== null) params = params.set('kind', query.kind);
    if (query.q !== null) params = params.set('q', query.q);
    if (query.cursor !== null) params = params.set('cursor', query.cursor);
    return this.http.get<DirectoryPageDto>('/api/directory', { params });
  }

  get(id: string): Observable<ListingProfileDto> {
    return this.http.get<ListingProfileDto>(`/api/directory/${encodeURIComponent(id)}`);
  }

  startConversation(id: string): Observable<ListingConversationDto> {
    return this.http.post<ListingConversationDto>(
      `/api/directory/${encodeURIComponent(id)}/conversation`,
      null,
    );
  }

  follow(id: string): Observable<ListingFollowDto> {
    return this.http.put<ListingFollowDto>(`/api/directory/${encodeURIComponent(id)}/follow`, null);
  }

  unfollow(id: string): Observable<ListingFollowDto> {
    return this.http.delete<ListingFollowDto>(`/api/directory/${encodeURIComponent(id)}/follow`);
  }

  updateOwn(id: string, update: OwnListingUpdateDto): Observable<OwnListingSavedDto> {
    return this.http
      .put<OwnListingSavedDto>(`/api/directory/${encodeURIComponent(id)}`, update)
      .pipe(catchError(asApiError));
  }

  uploadPhoto(file: File): Observable<OwnListingPhotoDto> {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<OwnListingPhotoDto>('/api/directory/photos', body)
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
