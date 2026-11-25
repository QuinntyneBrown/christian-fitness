import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { NotificationListDto, NotificationsApi } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link NotificationsApi} over HTTP: `GET /api/notifications` and `POST /api/notifications/read`
 * (ADR 0083). It holds no state and is provided on the member shell.
 */
@Injectable()
export class HttpNotificationsService implements NotificationsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<NotificationListDto> {
    return this.http.get<NotificationListDto>('/api/notifications');
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>('/api/notifications/read', null);
  }
}
