import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** `POST /api/data-exports`: when the member asked; the link is emailed within 24 hours of it. */
export interface DataExportRequestedDto {
  requestedAt: string;
}

/**
 * The member's own data (L2-066; ADR 0117). `requestDownload` records a request, or answers the
 * one made in the last 24 hours. A refusal or no answer errors with an `ApiError`.
 */
export interface DataApi {
  requestDownload(): Observable<DataExportRequestedDto>;
}

/** Binds {@link DataApi}; each screen that uses it provides it on its own route component. */
export const DATA_SERVICE = new InjectionToken<DataApi>('DATA_SERVICE');
