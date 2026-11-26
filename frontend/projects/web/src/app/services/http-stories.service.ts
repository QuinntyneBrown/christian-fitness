import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { PublishedStoryDto, StoriesApi } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link StoriesApi} over HTTP: `GET /api/public/stories/{slug}` (ADR 0105). A 5xx opens the
 * server-error screen through the interceptor; every failure passes on to the screen. It holds no
 * state, and is provided on the story page, so it lives only while the page does.
 */
@Injectable()
export class HttpStoriesService implements StoriesApi {
  private readonly http = inject(HttpClient);

  get(slug: string): Observable<PublishedStoryDto> {
    return this.http.get<PublishedStoryDto>(`/api/public/stories/${encodeURIComponent(slug)}`);
  }
}
