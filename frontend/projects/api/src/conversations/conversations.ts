import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** The newest message of a conversation, as its row shows it. */
export interface LastMessageDto {
  author: string;
  /** Plain text, never markup. */
  text: string;
  /** An ISO instant in UTC. */
  sentAt: string;
}

/**
 * One row of the Messages list (L2-015; ADR 0042). `kind` is `group` for a standalone event's chat,
 * whose `id` is the event's id, and `series` for a series' one chat, whose `id` is the series' (ADR
 * 0099); both carry a `memberCount`. A direct conversation (slice 14.1) is `direct`, with no member
 * count.
 */
export interface ConversationSummaryDto {
  kind: 'group' | 'series' | 'direct';
  id: string;
  name: string;
  memberCount: number | null;
  lastMessage: LastMessageDto | null;
  unreadCount: number;
  /** An ISO instant in UTC: the last message's time, or the member's registration when none. */
  activityAt: string;
}

/**
 * The member's conversations, newest first, at most 50 (L2-015 AC1). Any failure errors with the
 * `HttpErrorResponse`, and a 5xx to it opens the server-error screen.
 */
export interface Conversations {
  list(): Observable<ConversationSummaryDto[]>;
}

/** Binds {@link Conversations}; the Messages screen's providers provide it. */
export const CONVERSATIONS = new InjectionToken<Conversations>('CONVERSATIONS');
