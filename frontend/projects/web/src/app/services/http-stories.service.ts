import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { FrontPageDto, NewsSectionSlug, StoriesApi } from '@cf/api';
import type { Observable } from 'rxjs';

/** {@link StoriesApi} over HTTP: `GET /api/public/stories?section=&cursor=`. Holds no state. */
@Injectable()
export class HttpStoriesService implements StoriesApi {
  private readonly http = inject(HttpClient);

  frontPage(section: NewsSectionSlug | null, cursor: string | null): Observable<FrontPageDto> {
    let params = new HttpParams();
    if (section) params = params.set('section', section);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<FrontPageDto>('/api/public/stories', { params });
  }
}
