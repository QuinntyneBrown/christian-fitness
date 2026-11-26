import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminStoriesApi,
  AdminStoryDto,
  AdminStoryListDto,
  AdminStoryListQuery,
  StoryFieldsDto,
  StoryImageUploadDto,
  StoryOptionsDto,
  StoryPreviewDto,
  StorySaveDto,
  StoryScheduleDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

const BASE = '/api/admin/stories';

/**
 * {@link AdminStoriesApi} over HTTP: `/api/admin/stories` (ADR 0097). A failure errors with an
 * `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpAdminStoriesService implements AdminStoriesApi {
  private readonly http = inject(HttpClient);

  list(query: AdminStoryListQuery): Observable<AdminStoryListDto> {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    if (query.page > 1) params = params.set('page', query.page);
    return this.http.get<AdminStoryListDto>(BASE, { params }).pipe(catchError(asApiError));
  }

  get(id: string): Observable<AdminStoryDto> {
    return this.http.get<AdminStoryDto>(at(id)).pipe(catchError(asApiError));
  }

  create(fields: StoryFieldsDto): Observable<AdminStoryDto> {
    return this.http.post<AdminStoryDto>(BASE, fields).pipe(catchError(asApiError));
  }

  save(id: string, save: StorySaveDto): Observable<AdminStoryDto> {
    return this.http.put<AdminStoryDto>(at(id), save).pipe(catchError(asApiError));
  }

  submit(id: string, version: number): Observable<AdminStoryDto> {
    return this.act(id, 'submit', { version });
  }

  returnToDraft(id: string, version: number): Observable<AdminStoryDto> {
    return this.act(id, 'return-to-draft', { version });
  }

  publish(id: string, save: StorySaveDto): Observable<AdminStoryDto> {
    return this.act(id, 'publish', save);
  }

  schedule(id: string, save: StoryScheduleDto): Observable<AdminStoryDto> {
    return this.act(id, 'schedule', save);
  }

  unschedule(id: string, version: number): Observable<AdminStoryDto> {
    return this.act(id, 'unschedule', { version });
  }

  update(id: string, save: StorySaveDto): Observable<AdminStoryDto> {
    return this.act(id, 'update', save);
  }

  unpublish(id: string, version: number): Observable<AdminStoryDto> {
    return this.act(id, 'unpublish', { version });
  }

  uploadImage(file: File): Observable<StoryImageUploadDto> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<StoryImageUploadDto>(`${BASE}/images`, body).pipe(catchError(asApiError));
  }

  preview(id: string): Observable<StoryPreviewDto> {
    return this.http.get<StoryPreviewDto>(`${at(id)}/preview`).pipe(catchError(asApiError));
  }

  options(): Observable<StoryOptionsDto> {
    return this.http.get<StoryOptionsDto>(`${BASE}/options`).pipe(catchError(asApiError));
  }

  private act(id: string, action: string, body: object): Observable<AdminStoryDto> {
    return this.http.post<AdminStoryDto>(`${at(id)}/${action}`, body).pipe(catchError(asApiError));
  }
}

function at(id: string): string {
  return `${BASE}/${encodeURIComponent(id)}`;
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
