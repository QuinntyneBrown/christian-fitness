import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** How much waits behind each area: for now the listing suggestions to check (ADR 0090). */
export interface AdminCountsDto {
  suggestions: number;
  /** Stories waiting in review; none for a Moderator (L2-068 AC5; ADR 0097). */
  storiesInReview: number;
}

/** `GET /api/admin/counts` (ADR 0079, ADR 0090): the work waiting behind the navigation's areas. */
export interface AdminCountsApi {
  /** The counts. A failure errors; the navigation then shows no count. */
  counts(): Observable<AdminCountsDto>;
}

/** Binds {@link AdminCountsApi}; the admin shell provides it on its routed component. */
export const ADMIN_COUNTS_SERVICE = new InjectionToken<AdminCountsApi>('ADMIN_COUNTS_SERVICE');

/** Asks the admin shell to read the counts again, after a screen decided something (ADR 0090). */
export interface AdminCountsRefresh {
  refresh(): void;
}

/** Binds {@link AdminCountsRefresh}; the admin shell provides it to the screens it holds. */
export const ADMIN_COUNTS = new InjectionToken<AdminCountsRefresh>('ADMIN_COUNTS');
