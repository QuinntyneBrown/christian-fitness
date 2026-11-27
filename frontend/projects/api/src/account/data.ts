import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** `POST /api/data-exports`: when the member asked; the link is emailed within 24 hours of it. */
export interface DataExportRequestedDto {
  requestedAt: string;
}

/** `GET /api/data-exports/{id}`: when the link of the member's own archive stops working. */
export interface DataExportDto {
  expiresAt: string;
}

/**
 * The member's own data (L2-066; ADR 0117). `requestDownload` records a request, or answers the
 * one made in the last 24 hours. `download` reads the member's own working link; any other id is
 * refused with `not_found`. `archive` reads that link's .zip. A refusal or no answer errors with
 * an `ApiError`.
 *
 * `deleteAccount` asks for the account's deletion with the word typed to confirm it (`POST
 * /api/account/deletion`, L2-066 AC4, AC5; ADR 0118) and completes once the member is signed out.
 * A refusal errors with an `ApiError`: `validation_failed` (400) for another word, `staff_account`
 * (403), `too_many_attempts` (429).
 */
export interface DataApi {
  requestDownload(): Observable<DataExportRequestedDto>;
  download(id: string): Observable<DataExportDto>;
  archive(id: string): Observable<Blob>;
  deleteAccount(confirm: string): Observable<void>;
}

/** Binds {@link DataApi}; each screen that uses it provides it on its own route component. */
export const DATA_SERVICE = new InjectionToken<DataApi>('DATA_SERVICE');
