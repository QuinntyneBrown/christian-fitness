import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { LandingProfessionalDto, PublicProfessionalsApi } from '@cf/api';
import type { Observable } from 'rxjs';

/** {@link PublicProfessionalsApi} over HTTP: `GET /api/public/services/featured`. Holds no state. */
@Injectable()
export class HttpPublicProfessionalsService implements PublicProfessionalsApi {
  private readonly http = inject(HttpClient);

  featured(): Observable<LandingProfessionalDto[]> {
    return this.http.get<LandingProfessionalDto[]>('/api/public/services/featured');
  }
}
