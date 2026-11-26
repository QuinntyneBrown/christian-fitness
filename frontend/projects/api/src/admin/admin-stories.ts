import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** A story's status as the API and the address name it (L2-068; ADR 0097). */
export type StoryStatusName = 'draft' | 'review' | 'scheduled' | 'published';

/** The front page's six sections (L2-001 AC1). */
export type StorySectionName =
  'events' | 'training' | 'nutrition' | 'faith-and-body' | 'community' | 'pros';

/** Where a published story sits on the front page (L2-069 AC1). */
export type StoryPlacementName = 'lead' | 'top' | 'latest';

/** What a story points readers to (L2-069 AC1). */
export interface StoryPointerDto {
  kind: 'event' | 'listing';
  id: string;
}

/** The part of the lead image readers see: a 16:9 rectangle of the original, in its pixels. */
export interface StoryCropDto {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The lead image: the stored original's key and the crop (L2-069 AC9; ADR 0097). */
export interface StoryImageDto {
  key: string;
  crop: StoryCropDto;
}

/** Everything the editor writes (L2-069 AC1). */
export interface StoryFieldsDto {
  headline: string;
  summary: string;
  text: string;
  section: StorySectionName | null;
  bylineId: string | null;
  placement: StoryPlacementName;
  includeInWeekly: boolean;
  pointsTo: StoryPointerDto | null;
  nextStepText: string | null;
  nextStepLink: string | null;
  slug: string | null;
  image: StoryImageDto | null;
}

/** A save, Publish or Update: the fields and the version they were written over (L2-069 AC12). */
export interface StorySaveDto extends StoryFieldsDto {
  version: number;
}

/**
 * Schedule (L2-069 AC2; ADR 0104): the fields, the version, and the Toronto date (`yyyy-MM-dd`) and
 * time (`HH:mm`) the story goes out, which must be after now.
 */
export interface StoryScheduleDto extends StorySaveDto {
  publishDate: string;
  publishTime: string;
}

/** A story as the editor opens it. */
export interface AdminStoryDto extends StoryFieldsDto {
  id: string;
  status: StoryStatusName;
  version: number;
  /** When it was last saved. */
  savedAt: string;
  /** When it went out, while Published (a Scheduled story's time, once it has come). */
  publishedAt: string | null;
  /** When a Scheduled story goes out. */
  publishAt: string | null;
}

/** How many stories each tab holds (L2-068 AC3). */
export interface AdminStoryCountsDto {
  all: number;
  draft: number;
  review: number;
  scheduled: number;
  published: number;
}

/** One story waiting for review, as its call-out names it (L2-068 AC2). */
export interface AdminStoryReviewDto {
  id: string;
  headline: string;
  byline: string | null;
  section: StorySectionName | null;
  submittedAt: string;
}

/** One row of Stories (L2-068 AC1): `reads` is null for a story never published. */
export interface AdminStoryRowDto {
  id: string;
  headline: string;
  byline: string | null;
  section: StorySectionName | null;
  status: StoryStatusName;
  when: string;
  reads: number | null;
}

/** `GET /api/admin/stories?status=&page=`: one page of one tab. */
export interface AdminStoryListDto {
  counts: AdminStoryCountsDto;
  inReview: AdminStoryReviewDto[];
  items: AdminStoryRowDto[];
  page: number;
  pageCount: number;
}

/** Which tab and page of Stories: `status` none for All. */
export interface AdminStoryListQuery {
  status: StoryStatusName | null;
  page: number;
}

/** What the editor's selects offer (L2-069 AC1): bylines by name, published events and listings. */
export interface StoryOptionsDto {
  bylines: { id: string; name: string }[];
  events: { id: string; title: string }[];
  listings: { id: string; name: string }[];
}

/** An uploaded lead image: its key and the original's size, in pixels. */
export interface StoryImageUploadDto {
  imageKey: string;
  width: number;
  height: number;
}

/**
 * The card at the end of a story (L2-061 AC4), only with "Next step" words and a published event
 * or listing: what it points to, the words, and the editor's link or else that page's address.
 */
export interface StoryNextDto {
  kind: 'event' | 'listing';
  text: string;
  link: string;
}

/** `GET /api/admin/stories/{id}/preview`: the story as readers will see it, whatever its status (L2-069 AC13). */
export interface StoryPreviewDto {
  id: string;
  status: StoryStatusName;
  section: StorySectionName | null;
  headline: string;
  summary: string;
  author: string | null;
  publishedAt: string | null;
  text: string;
  image: StoryImageDto | null;
  next: StoryNextDto | null;
}

/** Where a stored lead image is read. */
export function storyImageUrl(key: string): string {
  return `/api/stories/images/${encodeURIComponent(key)}`;
}

/**
 * Admins list, write, review, preview, publish, schedule, update and unpublish stories (L2-068,
 * L2-069; ADR 0097, ADR 0104). Every failure errors with an `ApiError`; a Moderator is refused `forbidden_role`. A save
 * over a version not seen errors with `story_changed` (409); an action the status does not allow
 * with `status_conflict` (409); fields with `validation_failed` (400) naming them in `fieldCodes`.
 */
export interface AdminStoriesApi {
  list(query: AdminStoryListQuery): Observable<AdminStoryListDto>;
  get(id: string): Observable<AdminStoryDto>;
  /** A new Draft holding the fields. */
  create(fields: StoryFieldsDto): Observable<AdminStoryDto>;
  /** Saves a Draft or a story In review (the autosave). */
  save(id: string, save: StorySaveDto): Observable<AdminStoryDto>;
  submit(id: string, version: number): Observable<AdminStoryDto>;
  returnToDraft(id: string, version: number): Observable<AdminStoryDto>;
  /** Saves the fields, then publishes a Draft or a story In review. */
  publish(id: string, save: StorySaveDto): Observable<AdminStoryDto>;
  /** Saves the fields, then schedules a Draft or a story In review for its date and time. */
  schedule(id: string, save: StoryScheduleDto): Observable<AdminStoryDto>;
  /** A Scheduled story whose time has not come becomes a Draft. */
  unschedule(id: string, version: number): Observable<AdminStoryDto>;
  /** Update on a Published story: live at once. */
  update(id: string, save: StorySaveDto): Observable<AdminStoryDto>;
  unpublish(id: string, version: number): Observable<AdminStoryDto>;
  uploadImage(file: File): Observable<StoryImageUploadDto>;
  preview(id: string): Observable<StoryPreviewDto>;
  options(): Observable<StoryOptionsDto>;
}

/** Binds {@link AdminStoriesApi}; each stories screen provides it on its routed component. */
export const ADMIN_STORIES_SERVICE = new InjectionToken<AdminStoriesApi>('ADMIN_STORIES_SERVICE');
