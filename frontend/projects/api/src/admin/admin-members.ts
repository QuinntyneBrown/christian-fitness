import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** A member's standing in the community (L2-029), by the names the API reads and writes. */
export type MemberStatus = 'active' | 'flagged' | 'suspended';

/** A tab of the staff list of members (L2-028 AC3): everyone, or one status. */
export type AdminMemberFilter = 'all' | MemberStatus;

/**
 * A member as staff see them (`MemberRowDto`, ADR 0022): the join date as an ISO instant in UTC,
 * shown in Toronto; the home church is optional, sensitive and shown only here; `note` is why
 * staff last flagged or suspended them, in staff's words (ADR 0028), rendered as text.
 */
export interface AdminMemberDto {
  id: string;
  name: string;
  email: string;
  homeChurch: string | null;
  joinedAt: string;
  eventsAttended: number;
  status: MemberStatus;
  note: string | null;
}

/**
 * `GET /api/admin/members`: one page of members, newest joined first. `total` counts every member
 * of the community, `matches` those the search and status leave, and `page` is the page answered
 * (the last one when a later page was asked for).
 */
export interface AdminMemberListDto {
  total: number;
  matches: number;
  page: number;
  pageSize: number;
  members: AdminMemberDto[];
}

/** What the Members screen asks for: the tab, the search as typed and trimmed, the page from 1. */
export interface AdminMemberQuery {
  status: AdminMemberFilter;
  q: string;
  page: number;
}

/** What staff can do to a member from the moderation dialog (L2-029; ADR 0028, ADR 0029). */
export type ModerationAction = 'flag' | 'suspend' | 'reinstate';

/** Staff find members (L2-028; ADR 0022) and flag or suspend them (L2-029; ADR 0028). */
export interface AdminMembersApi {
  /** One page of the members `query` keeps. A failure errors with an `ApiError`. */
  search(query: AdminMemberQuery): Observable<AdminMemberListDto>;

  /**
   * Flags the Active member `id` with `note` and answers their row. A refusal errors with an
   * `ApiError`: `cannot_moderate_self` (403) for staff's own account, `forbidden_role` (403) for a
   * Moderator moderating staff, `status_conflict` (409) when the status does not allow it,
   * `member_not_found` (404), or `validation_failed` (400) for a missing or long note.
   */
  flag(id: string, note: string): Observable<AdminMemberDto>;

  /**
   * Suspends the Active or Flagged member `id` with `note`, confirmed by staff, and answers their
   * row; every session of theirs ends. Refusals are those of {@link flag}.
   */
  suspend(id: string, note: string): Observable<AdminMemberDto>;

  /**
   * Returns the Flagged or Suspended member `id` to Active, clears their note and answers their
   * row. Refusals are those of {@link flag}, but for a body's: it sends none.
   */
  reinstate(id: string): Observable<AdminMemberDto>;
}

/** Binds {@link AdminMembersApi}; the Members page provides it on its routed component. */
export const ADMIN_MEMBERS_SERVICE = new InjectionToken<AdminMembersApi>('ADMIN_MEMBERS_SERVICE');
