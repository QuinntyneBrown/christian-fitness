import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ListingKind } from './directory';

/** How the member knows whom they suggest (ADR 0085): the three cards of the form. */
export type SuggestionRelation = 'myself' | 'someone-i-know' | 'somewhere-ive-been';

/**
 * A suggestion as `POST /api/directory/suggestions` takes it (L2-062; ADR 0085): every text trimmed,
 * a blank optional one as `null`. For `myself` there is no `email` and no `mayTellWhoSuggested`.
 * The values are plain text, never rendered as HTML.
 */
export interface SuggestListingDto {
  relation: SuggestionRelation;
  kind: ListingKind;
  name: string;
  where: string;
  website: string | null;
  churchConnection: string | null;
  reason: string | null;
  email?: string | null;
  mayTellWhoSuggested?: boolean;
}

/** The stored suggestion, as the API answers it: its id and whom it names. */
export interface ListingSuggestionDto {
  id: string;
  name: string;
}

/** Suggesting a listing for the directory (L2-062; ADR 0085). */
export interface ListingSuggestionsApi {
  /**
   * Sends the signed-in member's suggestion and answers it as stored (AC5). A refusal or no answer
   * errors with an `ApiError`: 400 `validation_failed` with one `fieldCodes` entry per field (AC7),
   * 429 `too_many_attempts` (AC8), 403 `account_suspended` (AC11), status 0 for none.
   */
  suggest(suggestion: SuggestListingDto): Observable<ListingSuggestionDto>;
}

/** Binds {@link ListingSuggestionsApi}; the Suggest a listing screen provides it on its own route component. */
export const LISTING_SUGGESTIONS_SERVICE = new InjectionToken<ListingSuggestionsApi>(
  'LISTING_SUGGESTIONS_SERVICE',
);
