import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** A member's standing in the community (L2-029), by the names the API reads and writes. */
export type MemberStatus = 'active' | 'flagged' | 'suspended';

/** A tab of the staff list of members (L2-028 AC3): everyone, or one status. */
export type AdminMemberFilter = 'all' | MemberStatus;

/**
 * A member as staff see them (`MemberRowDto`, ADR 0022): the join date as an ISO instant in UTC,
 * shown in Toronto; the home church is optional, sensitive and shown only here.
 */
export interface AdminMemberDto {
  id: string;
  name: string;
  email: string;
  homeChurch: string | null;
  joinedAt: string;
  eventsAttended: number;
  status: MemberStatus;
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

/** Staff find members (L2-028; ADR 0022). */
export interface AdminMembersApi {
  /** One page of the members `query` keeps. A failure errors with an `ApiError`. */
  search(query: AdminMemberQuery): Observable<AdminMemberListDto>;
}

/** Binds {@link AdminMembersApi}; the Members page provides it on its routed component. */
export const ADMIN_MEMBERS_SERVICE = new InjectionToken<AdminMembersApi>('ADMIN_MEMBERS_SERVICE');
