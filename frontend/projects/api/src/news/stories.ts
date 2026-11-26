import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { StoryImageDto, StoryNextDto, StorySectionName } from '../admin/admin-stories';

/**
 * A Published story as anyone reads it, from `GET /api/public/stories/{slug}` (L2-061 AC1; ADR
 * 0105): `slug` is its current link, which differs from the one asked for when that was a former
 * link; `text` is the story as written, for the domain's one renderer.
 */
export interface PublishedStoryDto {
  id: string;
  slug: string;
  section: StorySectionName | null;
  headline: string;
  summary: string;
  author: string | null;
  publishedAt: string;
  text: string;
  image: StoryImageDto | null;
  next: StoryNextDto | null;
  /** Three other Published stories: the same section first, then the rest, newest first (AC6). */
  keepReading: StoryCardDto[];
}

/** One "Keep reading" card (L2-061 AC6). */
export interface StoryCardDto {
  slug: string;
  section: StorySectionName | null;
  headline: string;
  author: string | null;
  publishedAt: string;
  image: StoryImageDto | null;
}

/**
 * Published stories for anyone (L2-061; ADR 0105). `get` errors with an `ApiError`: 404
 * `not_found` for a slug that is no Published story's.
 */
export interface StoriesApi {
  get(slug: string): Observable<PublishedStoryDto>;
}

/** Binds {@link StoriesApi}; the story page provides it on its own route component. */
export const STORIES_SERVICE = new InjectionToken<StoriesApi>('STORIES_SERVICE');

/**
 * Counts reads of stories (L2-061 AC12; ADR 0105): `count` sends a read of the story at most once
 * per browser per 24 hours, remembered by a hashed id in local storage, never a cookie. It never
 * fails where a reader would see it.
 */
export interface StoryReadsApi {
  count(storyId: string): void;
}

/** Binds {@link StoryReadsApi}; the story page provides it on its own route component. */
export const STORY_READS = new InjectionToken<StoryReadsApi>('STORY_READS');
