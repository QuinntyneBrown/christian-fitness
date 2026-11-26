import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  FrontPageDto,
  PublishedStoryDto,
  StoriesApi,
  StorySectionName,
  StorySummaryDto,
} from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link StoriesApi} over HTTP: `GET /api/public/stories/{slug}` (ADR 0105), `GET
 * /api/public/stories?section=&skip=` and `GET /api/public/most-read-stories` (ADR 0107). A 5xx opens the
 * server-error screen through the interceptor; every failure passes on to the screen. It holds no
 * state, and is provided on the story and landing pages, so it lives only while one does.
 */
@Injectable()
export class HttpStoriesService implements StoriesApi {
  private readonly http = inject(HttpClient);

  get(slug: string): Observable<PublishedStoryDto> {
    return this.http.get<PublishedStoryDto>(`/api/public/stories/${encodeURIComponent(slug)}`);
  }

  frontPage(section: StorySectionName | null, skip: number): Observable<FrontPageDto> {
    let params = new HttpParams();
    if (section) params = params.set('section', section);
    if (skip > 0) params = params.set('skip', skip);
    return this.http.get<FrontPageDto>('/api/public/stories', { params });
  }

  mostRead(): Observable<StorySummaryDto[]> {
    return this.http.get<StorySummaryDto[]>('/api/public/most-read-stories');
  }
}
