import {
  HttpRequest,
  HttpXsrfTokenExtractor,
  type HttpEvent,
  type HttpHandlerFn,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { last, switchMap, type Observable } from 'rxjs';
import { isApiUrl } from '../errors/server-error';

/** The header the API reads the antiforgery token from (ADR 0009). */
export const ANTIFORGERY_HEADER = 'X-XSRF-TOKEN';

/** The readable cookie the API sets the antiforgery token in (ADR 0009). */
export const ANTIFORGERY_COOKIE = '__Host-cf-xsrf';

/** Where a visitor gets their first token: `GET /api/antiforgery` answers 204 and sets the cookie. */
export const ANTIFORGERY_PATH = '/api/antiforgery';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

/**
 * Makes sure a state-changing request to the API carries the antiforgery token (L2-030 AC3, ADR
 * 0009). Angular's own XSRF support (`withXsrfConfiguration`, which runs before this) copies the
 * `__Host-cf-xsrf` cookie into the `X-XSRF-TOKEN` header; when there is no cookie yet, as for a
 * visitor's first join or sign-in, this asks `GET /api/antiforgery` for one and then sends the
 * request with it. No component handles the token.
 */
export const antiforgeryInterceptor: HttpInterceptorFn = (request, next) => {
  if (
    SAFE_METHODS.has(request.method) ||
    !isApi(request.url) ||
    request.headers.has(ANTIFORGERY_HEADER)
  ) {
    return next(request);
  }
  const tokens = inject(HttpXsrfTokenExtractor);
  if (tokens.getToken() !== null) return next(request);
  return fetchToken(next).pipe(
    switchMap(() => {
      const token = tokens.getToken();
      return next(
        token === null ? request : request.clone({ setHeaders: { [ANTIFORGERY_HEADER]: token } }),
      );
    }),
  );
};

/** Asks for a token and completes once the answer, and so the cookie, has arrived. */
function fetchToken(next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  return next(new HttpRequest('GET', ANTIFORGERY_PATH)).pipe(last());
}

function isApi(url: string): boolean {
  return isApiUrl(url);
}
