import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Conversations, ConversationSummaryDto } from '@cf/api';
import { map, type Observable } from 'rxjs';

/**
 * {@link Conversations} over HTTP: `GET /api/conversations` (ADR 0042). It holds no state and is
 * provided on the Messages screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpConversationsService implements Conversations {
  private readonly http = inject(HttpClient);

  list(): Observable<ConversationSummaryDto[]> {
    return this.http
      .get<{ conversations: ConversationSummaryDto[] }>('/api/conversations')
      .pipe(map((body) => body.conversations));
  }
}
