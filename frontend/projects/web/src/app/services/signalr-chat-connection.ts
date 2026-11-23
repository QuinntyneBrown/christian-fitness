import { Injectable, type OnDestroy, signal } from '@angular/core';
import type { ChatAnswerDto, ChatConnection, ChatConnectionState, ChatMessageDto } from '@cf/api';
import type { HubConnection } from '@microsoft/signalr';
import { Subject } from 'rxjs';

/**
 * {@link ChatConnection} over SignalR to `/api/chat` (ADR 0039). The library is imported the first
 * time a chat is joined, so it stays out of the initial bundle. It is provided on the chat screen,
 * so the connection lives only while the screen does: `ngOnDestroy` removes the handler, completes
 * `messages` and stops the connection. The hub answers a refusal as a `code`; a connection that
 * cannot be made or kept rejects.
 */
@Injectable()
export class SignalRChatConnection implements ChatConnection, OnDestroy {
  private readonly current = signal<ChatConnectionState>('connecting');
  private readonly incoming = new Subject<ChatMessageDto>();
  private readonly cancelledEvents = new Subject<string>();
  private connection: HubConnection | null = null;
  private starting: Promise<HubConnection> | null = null;
  private destroyed = false;

  readonly state = this.current.asReadonly();
  readonly messages = this.incoming.asObservable();
  readonly cancelled = this.cancelledEvents.asObservable();

  async join(eventId: string): Promise<ChatAnswerDto> {
    const connection = await this.connect();
    return connection.invoke<ChatAnswerDto>('Join', eventId);
  }

  async send(eventId: string, text: string): Promise<ChatAnswerDto> {
    const connection = await this.connect();
    return connection.invoke<ChatAnswerDto>('Send', eventId, text);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.connection?.off('MessageReceived');
    this.connection?.off('EventCancelled');
    void this.connection?.stop();
    this.connection = null;
    this.incoming.complete();
    this.cancelledEvents.complete();
  }

  private connect(): Promise<HubConnection> {
    this.starting ??= this.start().catch((error: unknown) => {
      // A later join tries again from the start.
      this.starting = null;
      this.current.set('closed');
      throw error;
    });
    return this.starting;
  }

  private async start(): Promise<HubConnection> {
    this.current.set('connecting');
    const { HubConnectionBuilder } = await import('@microsoft/signalr');
    if (this.destroyed) throw new Error('The chat screen was closed.');
    const connection = new HubConnectionBuilder()
      .withUrl('/api/chat')
      .withAutomaticReconnect()
      .build();
    connection.on('MessageReceived', (message: ChatMessageDto) => this.incoming.next(message));
    connection.on('EventCancelled', (eventId: string) => this.cancelledEvents.next(eventId));
    connection.onreconnecting(() => this.current.set('reconnecting'));
    connection.onreconnected(() => this.current.set('connected'));
    connection.onclose(() => this.current.set('closed'));
    this.connection = connection;
    await connection.start();
    if (this.destroyed) {
      await connection.stop();
      throw new Error('The chat screen was closed.');
    }
    this.current.set('connected');
    return connection;
  }
}
