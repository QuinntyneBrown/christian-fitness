import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ChatHistory, ChatHistoryDto } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link ChatHistory} over HTTP: `GET /api/events/{id}/chat/messages?before=` (ADR 0040). It holds
 * no state and is provided on the chat screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpChatHistoryService implements ChatHistory {
  private readonly http = inject(HttpClient);

  latest(eventId: string): Observable<ChatHistoryDto> {
    return this.http.get<ChatHistoryDto>(this.url(eventId));
  }

  before(eventId: string, messageId: string): Observable<ChatHistoryDto> {
    return this.http.get<ChatHistoryDto>(this.url(eventId), {
      params: new HttpParams().set('before', messageId),
    });
  }

  markRead(eventId: string): Observable<void> {
    return this.http.post<void>(`${this.url(eventId).replace(/\/messages$/, '')}/read`, null);
  }

  private url(eventId: string): string {
    return `/api/events/${encodeURIComponent(eventId)}/chat/messages`;
  }
}
