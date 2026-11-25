import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { AdminCountsApi, AdminCountsDto } from '@cf/api';
import type { Observable } from 'rxjs';

/** {@link AdminCountsApi} over HTTP: `GET /api/admin/counts` (ADR 0090). It holds no state. */
@Injectable()
export class HttpAdminCountsService implements AdminCountsApi {
  private readonly http = inject(HttpClient);

  counts(): Observable<AdminCountsDto> {
    return this.http.get<AdminCountsDto>('/api/admin/counts');
  }
}
