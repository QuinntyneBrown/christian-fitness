import type { ChatMessageDto } from '@cf/api';
import { EVENT_TIME_ZONE } from '../events/event-when';

/** The most messages a chat screen holds in memory (L2-016; AGENTS.md, "Bound what grows"). */
export const CHAT_WINDOW_SIZE = 200;

/**
 * The window after `message` arrives: it goes last, a message already held (same id) changes
 * nothing, and the oldest fall off beyond `size`.
 */
export function withChatMessage(
  window: readonly ChatMessageDto[],
  message: ChatMessageDto,
  size: number = CHAT_WINDOW_SIZE,
): readonly ChatMessageDto[] {
  if (window.some((held) => held.id === message.id)) return window;
  const next = [...window, message];
  return next.length > size ? next.slice(next.length - size) : next;
}

let timeFormat: Intl.DateTimeFormat | undefined;

/** A message's time as the thread shows it, in Toronto: "8:42 AM". */
export function chatTime(sentAt: string): string {
  const instant = new Date(sentAt);
  if (Number.isNaN(instant.getTime())) return '';
  timeFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  // ICU puts a narrow no-break space before AM and PM; the mock has a plain space.
  return timeFormat.format(instant).replace(/\s/g, ' ');
}

/** The window after earlier messages join it, and whether the newest had to fall off its end. */
export interface EarlierWindow {
  messages: readonly ChatMessageDto[];
  droppedNewest: boolean;
}

/**
 * The window after a page of `earlier` messages (oldest first) joins it: they go first, any already
 * held (same id) are left out, and beyond `size` the newest fall off the end, so the member reads
 * on from where they scrolled to.
 */
export function withEarlierMessages(
  window: readonly ChatMessageDto[],
  earlier: readonly ChatMessageDto[],
  size: number = CHAT_WINDOW_SIZE,
): EarlierWindow {
  const held = new Set(window.map((message) => message.id));
  const next = [...earlier.filter((message) => !held.has(message.id)), ...window];
  return next.length > size
    ? { messages: next.slice(0, size), droppedNewest: true }
    : { messages: next, droppedNewest: false };
}
