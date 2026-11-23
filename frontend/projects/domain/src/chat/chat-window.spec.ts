import type { ChatMessageDto } from '@cf/api';
import { describe, expect, it } from 'vitest';
import { CHAT_WINDOW_SIZE, chatTime, withChatMessage, withEarlierMessages } from './chat-window';

function message(n: number): ChatMessageDto {
  return {
    id: `m${n}`,
    eventId: 'e1',
    authorId: 'a1',
    author: 'Grace Thompson',
    text: `Message ${n}`,
    sentAt: '2026-04-18T12:42:00Z',
  };
}

describe('withChatMessage', () => {
  it('puts a new message last', () => {
    expect(withChatMessage([message(1)], message(2)).map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('keeps the window as it is when the message is already in it', () => {
    const held = [message(1), message(2)];
    expect(withChatMessage(held, message(1))).toBe(held);
  });

  it.each([
    { size: 3, ids: ['m3', 'm4', 'm5'] },
    { size: 5, ids: ['m1', 'm2', 'm3', 'm4', 'm5'] },
    { size: 1, ids: ['m5'] },
  ])('holds the newest $size messages', ({ size, ids }) => {
    let window: readonly ChatMessageDto[] = [];
    for (let n = 1; n <= 5; n++) window = withChatMessage(window, message(n), size);
    expect(window.map((m) => m.id)).toEqual(ids);
  });

  it('holds 200 by default', () => {
    let window: readonly ChatMessageDto[] = [];
    for (let n = 1; n <= CHAT_WINDOW_SIZE + 5; n++) window = withChatMessage(window, message(n));
    expect(window).toHaveLength(200);
    expect(window[0].id).toBe('m6');
  });
});

describe('chatTime', () => {
  it.each([
    { sentAt: '2026-04-18T12:42:00Z', time: '8:42 AM' },
    { sentAt: '2026-04-18T23:05:00Z', time: '7:05 PM' },
    { sentAt: 'not a date', time: '' },
  ])('words $sentAt in Toronto as "$time"', ({ sentAt, time }) => {
    expect(chatTime(sentAt)).toBe(time);
  });
});

describe('withEarlierMessages', () => {
  it('puts earlier messages first, oldest first', () => {
    const result = withEarlierMessages([message(3), message(4)], [message(1), message(2)]);

    expect(result.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(result.droppedNewest).toBe(false);
  });

  it('leaves out an earlier message the window already holds', () => {
    const result = withEarlierMessages([message(2), message(3)], [message(1), message(2)]);

    expect(result.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it.each([
    { size: 4, ids: ['m1', 'm2', 'm3', 'm4'], dropped: false },
    { size: 3, ids: ['m1', 'm2', 'm3'], dropped: true },
    { size: 1, ids: ['m1'], dropped: true },
  ])('holds $size at most and says when the newest fell off', ({ size, ids, dropped }) => {
    const result = withEarlierMessages([message(3), message(4)], [message(1), message(2)], size);

    expect(result.messages.map((m) => m.id)).toEqual(ids);
    expect(result.droppedNewest).toBe(dropped);
  });
});
