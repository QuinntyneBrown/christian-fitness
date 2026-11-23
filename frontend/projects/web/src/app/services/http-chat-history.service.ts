import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ChatHistory, ChatHistoryDto } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link ChatHistory} over HTTP: `GET /api/events/{id}/chat/messages?before=` (ADR 0040), or with
 * `direct` the private conversation's `GET /api/messages/{memberId}/messages` (ADR 0043). It holds
 * no state and is provided on the chat screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpChatHistoryService implements ChatHistory {
  private readonly http = inject(HttpClient);

  latest(eventId: string, direct = false): Observable<ChatHistoryDto> {
    return this.http.get<ChatHistoryDto>(this.url(eventId, direct));
  }

  before(eventId: string, messageId: string, direct = false): Observable<ChatHistoryDto> {
    return this.http.get<ChatHistoryDto>(this.url(eventId, direct), {
      params: new HttpParams().set('before', messageId),
    });
  }

  markRead(eventId: string, direct = false): Observable<void> {
    return this.http.post<void>(
      `${this.url(eventId, direct).replace(/\/messages$/, '')}/read`,
      null,
    );
  }

  private url(eventId: string, direct: boolean): string {
    const id = encodeURIComponent(eventId);
    return direct ? `/api/messages/${id}/messages` : `/api/events/${id}/chat/messages`;
  }
}
