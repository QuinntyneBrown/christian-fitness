import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * One byline as Bylines shows it (`GET /api/admin/stories/bylines`, L2-077 AC1; ADR 0094): the
 * name, the short bio, the photo's key or none, and how many stories use it, as a number the app
 * words.
 */
export interface BylineDto {
  id: string;
  name: string;
  bio: string;
  photoKey: string | null;
  stories: number;
}

/** `GET /api/admin/stories/bylines`: every byline in name order, without regard to case. */
export interface BylineListDto {
  bylines: BylineDto[];
}

/** What the byline editor sends to add or save a byline (L2-077 AC3): the name and bio as typed. */
export interface BylineDraftDto {
  name: string;
  bio: string;
  photoKey: string | null;
}

/** The key an uploaded byline photo is kept under. */
export interface BylinePhotoDto {
  photoKey: string;
}

/** Admins manage the bylines stories run under (L2-077; ADR 0094). A Moderator is refused `forbidden_role`. */
export interface AdminBylinesApi {
  /** Every byline in name order. A failure errors with an `ApiError`. */
  list(): Observable<BylineListDto>;

  /**
   * Add byline (L2-077 AC3, AC4): the byline as saved. A field errors with `validation_failed`
   * (400) naming it in `fieldCodes`; a name another byline has, in any case, with
   * `byline_name_taken` (409).
   */
  create(draft: BylineDraftDto): Observable<BylineDto>;

  /** Save byline (L2-077 AC5): as `create`, and an unknown byline errors with `not_found` (404). */
  update(id: string, draft: BylineDraftDto): Observable<BylineDto>;

  /**
   * Remove byline (L2-077 AC6, AC7): nothing on success. A byline a story uses errors with
   * `byline_in_use` (409), an unknown one with `not_found` (404).
   */
  remove(id: string): Observable<void>;

  /** Keeps one photo (JPEG, PNG or WebP, up to 5 MB) and answers its key; `photo_invalid` otherwise. */
  uploadPhoto(file: File): Observable<BylinePhotoDto>;
}

/** Binds {@link AdminBylinesApi}; the Bylines page provides it on its routed component. */
export const ADMIN_BYLINES_SERVICE = new InjectionToken<AdminBylinesApi>('ADMIN_BYLINES_SERVICE');
