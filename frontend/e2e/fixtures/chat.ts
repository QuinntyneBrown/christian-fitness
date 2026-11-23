import type { Page, WebSocketRoute } from '@playwright/test';
import type { ApiHandlers } from './api-handlers';
import { SIGNED_IN } from './api-handlers';

/** A message as the hub pushes it (`MessageReceived`, ADR 0039). */
export interface ChatMessage {
  id: string;
  eventId: string;
  authorId: string;
  author: string;
  text: string;
  sentAt: string;
}

/** What the hub answers to a join: a refusal `code`, or the chat's title and the caller (ADR 0039). */
export interface JoinAnswer {
  code: string | null;
  title: string | null;
  memberId: string | null;
}

/** The messages in a page of history (L2-016 AC6). */
const HISTORY_PAGE = 50;

/** SignalR's JSON protocol ends every frame with this record separator. */
const SEPARATOR = '\u001e';

/**
 * Stands in for the chat hub (`/api/chat`): it answers SignalR's negotiate request and speaks its
 * JSON protocol over the page's WebSocket, so the real client library runs in the spec. `Join`
 * answers `join`; `Send` records the text, answers success and pushes the message back to the page
 * as the hub does to every member of the chat. `push` delivers a message from another member.
 * `GET /api/events/{id}/chat/messages` answers the stored `history` as the API does (ADR 0040):
 * the latest 50, or the 50 before the message `before`, oldest first, with `hasMore`.
 * `failNextSends` makes the next sends fail as a dropped connection does: the invocation errors.
 */
export class FakeChatHub {
  /** The texts the page sent, in order. */
  readonly sent: string[] = [];
  /** The event ids the page joined, in order. */
  readonly joined: string[] = [];
  /** The `before` of each history request, in order; `null` for the latest page. */
  readonly pagesAsked: (string | null)[] = [];
  /** The event id of each read marker the page set (`POST /api/events/{id}/chat/read`, ADR 0042), in order. */
  readonly read: string[] = [];

  private socket: WebSocketRoute | null = null;
  private count = 0;
  private failing = 0;

  private constructor(
    private join: JoinAnswer,
    private readonly history: readonly ChatMessage[],
  ) {}

  /** Answers the hub's requests on `page` and `api`; call before the page opens the chat. */
  static async install(
    page: Page,
    api: ApiHandlers,
    join: JoinAnswer,
    history: readonly ChatMessage[] = [],
    cancelled = false,
  ): Promise<FakeChatHub> {
    const hub = new FakeChatHub(join, history);
    api.on('GET', /^\/api\/events\/[0-9a-f-]{36}\/chat\/messages$/, (request) => {
      const before = new URL(request.url()).searchParams.get('before');
      hub.pagesAsked.push(before);
      const end = before === null ? history.length : history.findIndex((m) => m.id === before);
      const start = Math.max(0, end - HISTORY_PAGE);
      return { json: { messages: history.slice(start, end), hasMore: start > 0, cancelled } };
    });
    api.on('POST', /^\/api\/events\/[0-9a-f-]{36}\/chat\/read$/, (request) => {
      hub.read.push(new URL(request.url()).pathname.split('/')[3]);
      return { status: 204 };
    });
    api.on('POST', '/api/chat/negotiate', () => ({
      json: {
        negotiateVersion: 1,
        connectionId: 'e2e-connection',
        connectionToken: 'e2e-token',
        availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
      },
    }));
    await page.routeWebSocket(/\/api\/chat\?/, (socket) => hub.attach(socket));
    return hub;
  }

  /** The next `count` sends fail: the hub answers the invocation with an error. */
  failNextSends(count: number): void {
    this.failing = count;
  }

  /** The event is cancelled while the page is in its chat: the hub pushes `EventCancelled` (ADR 0041). */
  cancelEvent(eventId: string): void {
    this.frame({ type: 1, target: 'EventCancelled', arguments: [eventId] });
  }

  /** A message from another member reaches the page. */
  push(message: Omit<ChatMessage, 'id'> & { id?: string }): void {
    this.count += 1;
    this.frame({
      type: 1,
      target: 'MessageReceived',
      arguments: [{ id: `m${this.count}`, ...message }],
    });
  }

  private attach(socket: WebSocketRoute): void {
    this.socket = socket;
    socket.onMessage((data) => {
      for (const text of String(data).split(SEPARATOR)) {
        if (!text) continue;
        const frame = JSON.parse(text) as {
          type?: number;
          protocol?: string;
          invocationId?: string;
          target?: string;
          arguments?: unknown[];
        };
        if (frame.protocol !== undefined) {
          socket.send(`{}${SEPARATOR}`);
        } else if (frame.type === 1) {
          this.invoked(frame);
        }
      }
    });
  }

  private invoked(frame: { invocationId?: string; target?: string; arguments?: unknown[] }): void {
    const [eventId, text] = frame.arguments as [string, string?];
    if (frame.target === 'Send' && this.failing > 0) {
      this.failing -= 1;
      this.frame({ type: 3, invocationId: frame.invocationId, error: 'The send failed.' });
      return;
    }
    let result: JoinAnswer = { code: null, title: null, memberId: null };
    if (frame.target === 'Join') {
      this.joined.push(eventId);
      result = this.join;
    } else if (frame.target === 'Send') {
      this.sent.push(text ?? '');
    }
    this.frame({ type: 3, invocationId: frame.invocationId, result });
    if (frame.target === 'Send') {
      this.push({
        eventId,
        authorId: SIGNED_IN.memberId,
        author: SIGNED_IN.name,
        text: text ?? '',
        sentAt: '2026-04-18T12:45:00Z',
      });
    }
  }

  private frame(body: object): void {
    this.socket?.send(JSON.stringify(body) + SEPARATOR);
  }
}
