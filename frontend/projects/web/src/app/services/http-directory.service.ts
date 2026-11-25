import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  DirectoryApi,
  DirectoryPageDto,
  DirectoryQuery,
  ListingConversationDto,
  ListingProfileDto,
} from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link DirectoryApi} over HTTP: `GET /api/directory?kind=&q=&cursor=` (ADR 0082) and
 * `GET /api/directory/{id}` and `POST /api/directory/{id}/conversation` (ADR 0087). A 5xx opens
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
}
