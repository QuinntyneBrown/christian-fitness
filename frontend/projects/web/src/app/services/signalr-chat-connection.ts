import { Injectable, type OnDestroy, signal } from '@angular/core';
import type {
  ChatAnswerDto,
  ChatConnection,
  ChatConnectionState,
  ChatMessageDto,
  NotificationDto,
  NotificationStream,
} from '@cf/api';
import type { HubConnection } from '@microsoft/signalr';
import { Subject } from 'rxjs';

/**
 * The member's one real-time connection (ADR 0039, ADR 0083): {@link ChatConnection} and
 * {@link NotificationStream} over SignalR to `/api/chat`. The library is imported when the
 * connection is first opened, so it stays out of the initial bundle. It is provided on the member
 * shell, so chat screens and the bell share the connection and it lives as long as the member's
 * session in the app: `ngOnDestroy` removes every handler, completes the streams and stops it. The
 * hub answers a refusal as a `code`; a connection that cannot be made or kept rejects.
 */
@Injectable()
export class SignalRChatConnection implements ChatConnection, NotificationStream, OnDestroy {
  private readonly current = signal<ChatConnectionState>('connecting');
  private readonly incoming = new Subject<ChatMessageDto>();
  private readonly cancelledEvents = new Subject<string>();
  private readonly notifications = new Subject<NotificationDto>();
  private connection: HubConnection | null = null;
  private starting: Promise<HubConnection> | null = null;
  private destroyed = false;

  readonly state = this.current.asReadonly();
  readonly messages = this.incoming.asObservable();
  readonly cancelled = this.cancelledEvents.asObservable();
  readonly received = this.notifications.asObservable();

  async connect(): Promise<void> {
    await this.open();
  }

  async join(eventId: string, direct = false): Promise<ChatAnswerDto> {
    const connection = await this.open();
    return connection.invoke<ChatAnswerDto>(direct ? 'JoinDirect' : 'Join', eventId);
  }

  async send(eventId: string, text: string, direct = false): Promise<ChatAnswerDto> {
    const connection = await this.open();
    return connection.invoke<ChatAnswerDto>(direct ? 'SendDirect' : 'Send', eventId, text);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.connection?.off('MessageReceived');
    this.connection?.off('EventCancelled');
    this.connection?.off('NotificationReceived');
    void this.connection?.stop();
    this.connection = null;
    this.incoming.complete();
    this.cancelledEvents.complete();
    this.notifications.complete();
  }

  private open(): Promise<HubConnection> {
    this.starting ??= this.start().catch((error: unknown) => {
      // A later join or connect tries again from the start.
      this.starting = null;
      this.current.set('closed');
      throw error;
    });
    return this.starting;
  }

  private async start(): Promise<HubConnection> {
    this.current.set('connecting');
    const { HubConnectionBuilder } = await import('@microsoft/signalr');
    if (this.destroyed) throw new Error('The member left the app.');
    const connection = new HubConnectionBuilder()
      .withUrl('/api/chat')
      .withAutomaticReconnect()
      .build();
    connection.on('MessageReceived', (message: ChatMessageDto) => this.incoming.next(message));
    connection.on('EventCancelled', (eventId: string) => this.cancelledEvents.next(eventId));
    connection.on('NotificationReceived', (notification: NotificationDto) =>
      this.notifications.next(notification),
    );
    connection.onreconnecting(() => this.current.set('reconnecting'));
    connection.onreconnected(() => this.current.set('connected'));
    connection.onclose(() => this.current.set('closed'));
    this.connection = connection;
    await connection.start();
    if (this.destroyed) {
      await connection.stop();
      throw new Error('The member left the app.');
    }
    this.current.set('connected');
    return connection;
  }
}
