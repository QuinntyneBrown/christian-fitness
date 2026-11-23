import { InjectionToken, type Signal } from '@angular/core';
import type { Observable } from 'rxjs';

/** One message of an event's group chat as it arrives (ADR 0039): plain text, never markup. */
export interface ChatMessageDto {
  id: string;
  eventId: string;
  authorId: string;
  author: string;
  text: string;
  /** An ISO instant in UTC. */
  sentAt: string;
}

/**
 * What the hub answers to a join or a send. A refusal is an answer with a `code`
 * (`not_a_participant`, `message_invalid`), never an error; a join that succeeds names the chat
 * (the event's title) and the caller.
 */
export interface ChatAnswerDto {
  code: string | null;
  title: string | null;
  memberId: string | null;
}

/** Where the connection to the chat is. */
export type ChatConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'closed';

/**
 * The one connection to the chat hub (ADR 0039). A screen provides it on its routed component, so
 * it lives only while the screen does; no component opens its own. The real-time library loads
 * the first time `join` is called, and `ngOnDestroy` stops the connection and drops its handlers.
 */
export interface ChatConnection {
  readonly state: Signal<ChatConnectionState>;

  /** Every message the chat receives, mine included, once `join` has been answered without a code. */
  readonly messages: Observable<ChatMessageDto>;

  /** Connects if need be and joins the event's chat. Rejects when the connection cannot be made. */
  join(eventId: string): Promise<ChatAnswerDto>;

  /** Sends a message to the event's chat. Rejects when the connection is not up. */
  send(eventId: string, text: string): Promise<ChatAnswerDto>;
}

/** Binds {@link ChatConnection}; the chat screen's providers provide it. */
export const CHAT_CONNECTION = new InjectionToken<ChatConnection>('CHAT_CONNECTION');
