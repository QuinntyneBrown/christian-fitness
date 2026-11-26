import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** A section as the address and the public API name it (ADR 0071). */
export type NewsSectionSlug =
  'events' | 'training' | 'nutrition' | 'faith-body' | 'community' | 'pros';

/**
 * A published story as the front page lists it (`StorySummaryDto`): no text, and nothing that
 * identifies or reaches a member; `byline` is the story's author line (L2-001 AC10).
 */
export interface StorySummaryDto {
  id: string;
  slug: string;
  section: NewsSectionSlug;
  headline: string;
  /** The summary, or none. */
  summary: string | null;
  byline: string;
  /** When it was published, as an ISO instant in UTC; the screen words its age in Toronto. */
  publishedAt: string;
  /** The key of its lead image (`GET /api/stories/images/{key}`), or none. */
  imageKey: string | null;
}

/**
 * One answer of `GET /api/public/stories` (`FrontPageDto`). Latest's first page carries the lead,
 * at most four headlines, the first 12 stories of the river and the most-read stories; a section,
 * and any later page, carries the river alone. `nextCursor` asks for the next 12, and is none at
 * the end or once the river holds 60 (L2-037).
 */
export interface FrontPageDto {
  lead: StorySummaryDto | null;
  headlines: StorySummaryDto[];
  latest: StorySummaryDto[];
  nextCursor: string | null;
  /** At most five, most read first; empty when nothing ranks. */
  mostRead: StorySummaryDto[];
}

/** The stories a visitor with no session may read (L2-001). */
export interface StoriesApi {
  /**
   * The front page of `section`, or of every section for none; `cursor` asks for the page after
   * one already read. Any failure errors with the `HttpErrorResponse`.
   */
  frontPage(section: NewsSectionSlug | null, cursor: string | null): Observable<FrontPageDto>;
}

/** Binds {@link StoriesApi}; the landing page provides it on its own route component. */
export const STORIES_SERVICE = new InjectionToken<StoriesApi>('STORIES_SERVICE');
