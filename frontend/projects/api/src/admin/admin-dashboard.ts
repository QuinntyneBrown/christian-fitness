import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * One week of community activity (`CommunityActivityWeekDto`, ADR 0058): `start` is the Monday
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

/** What the admin Dashboard reads (L2-020; ADR 0058). */
export interface AdminDashboardApi {
  /** The weekly activity. A failure errors with an `ApiError`. */
  activity(): Observable<CommunityActivityDto>;
}

/** Binds {@link AdminDashboardApi}; the Dashboard page provides it on its routed component. */
export const ADMIN_DASHBOARD_SERVICE = new InjectionToken<AdminDashboardApi>(
  'ADMIN_DASHBOARD_SERVICE',
);
