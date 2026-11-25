import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * One week of community activity (`CommunityActivityWeekDto`, ADR 0000): `start` is the Monday
 * 00:00 UTC that opens the week as an ISO instant. Counts only, no message text and no names.
 */
export interface ActivityWeekDto {
  start: string;
  newMembers: number;
  registrations: number;
  /** Event chat and direct messages together. */
  messages: number;
}

/** `GET /api/admin/dashboard/activity`: the last eight weeks, oldest first, the current week last. */
export interface CommunityActivityDto {
  weeks: ActivityWeekDto[];
}

/** One listing suggestion waiting for review (`AwaitingSuggestionDto`, ADR 0090). */
export interface AwaitingSuggestionDto {
  id: string;
  name: string;
}

/** One pending application as the Dashboard names it (`AwaitingApplicationDto`, ADR 0060). */
export interface AwaitingApplicationDto {
  id: string;
  name: string;
  role: string;
  /** An ISO instant. */
  submittedAt: string;
}

/** One flagged member as the Dashboard names them: staff's own note, as the Members screen shows it. */
export interface AwaitingFlaggedMemberDto {
  id: string;
  name: string;
  note: string | null;
}

/** How many wait in all, and the oldest few of them. */
export interface AwaitingListDto<T> {
  total: number;
  items: T[];
}

/**
 * `GET /api/admin/dashboard/awaiting` (ADR 0060): `applications` is absent from a Moderator's
 * answer, because a Moderator does not act on applications.
 */
export interface WorkAwaitingStaffDto {
  applications?: AwaitingListDto<AwaitingApplicationDto>;
  flaggedMembers: AwaitingListDto<AwaitingFlaggedMemberDto>;
  /** The listing suggestions waiting for review, for both roles (L2-020 AC11; ADR 0090). */
  suggestions: AwaitingListDto<AwaitingSuggestionDto>;
}

/** What the admin Dashboard reads (L2-020; ADR 0059, ADR 0060). */
export interface AdminDashboardApi {
  /** The weekly activity. A failure errors with an `ApiError`. */
  activity(): Observable<CommunityActivityDto>;
  /** The applications and flagged members waiting for staff. A failure errors with an `ApiError`. */
  awaiting(): Observable<WorkAwaitingStaffDto>;
}

/** Binds {@link AdminDashboardApi}; the Dashboard page provides it on its routed component. */
export const ADMIN_DASHBOARD_SERVICE = new InjectionToken<AdminDashboardApi>(
  'ADMIN_DASHBOARD_SERVICE',
);
