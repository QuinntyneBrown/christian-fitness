import {
  HttpErrorResponse,
  HttpRequest,
  HttpResponse,
  HttpXsrfTokenExtractor,
  type HttpEvent,
  type HttpHandlerFn,
} from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { firstValueFrom, of, throwError, type Observable } from 'rxjs';
import { antiforgeryInterceptor } from './antiforgery-interceptor';

/** A cookie jar the fake `GET /api/antiforgery` fills, read as Angular's extractor reads it. */
class Jar extends HttpXsrfTokenExtractor {
  token: string | null = null;
  getToken(): string | null {
    return this.token;
  }
}

interface Sent {
  method: string;
  url: string;
  token: string | null;
}

/** Runs one request through the interceptor and records what reached the backend, in order. */
async function intercept(options: {
  method: string;
  url: string;
  token?: string | null;
  header?: string;
  issued?: string | null;
  tokenStatus?: number;
}): Promise<{ sent: Sent[]; outcome: unknown }> {
  const jar = new Jar();
  jar.token = options.token ?? null;
  const sent: Sent[] = [];
  const next: HttpHandlerFn = (request): Observable<HttpEvent<unknown>> => {
    sent.push({
      method: request.method,
      url: request.url,
      token: request.headers.get('X-XSRF-TOKEN'),
    });
    if (request.url === '/api/antiforgery') {
      if ((options.tokenStatus ?? 204) >= 400) {
        return throwError(
          () => new HttpErrorResponse({ status: options.tokenStatus, url: request.url }),
        );
      }
      jar.token = options.issued === undefined ? 'issued-token' : options.issued;
      return of(new HttpResponse({ status: 204 }));
    }
    return of(new HttpResponse({ status: 200, body: 'answered' }));
  };
  const injector = Injector.create({
    providers: [{ provide: HttpXsrfTokenExtractor, useValue: jar }],
  });
  let request = new HttpRequest(options.method, options.url, null);
  if (options.header) request = request.clone({ setHeaders: { 'X-XSRF-TOKEN': options.header } });
  const result = runInInjectionContext(injector, () => antiforgeryInterceptor(request, next));
  const outcome = await firstValueFrom(result).then(
    (event) => (event instanceof HttpResponse ? event.body : event),
    (error: unknown) => error,
  );
  return { sent, outcome };
}

// ADR 0009, L2-030 AC3: every state-changing API request carries the token; one row per case.
describe('antiforgeryInterceptor', () => {
  it.each([
    // why, method, url, cookie token, what reaches the backend
    {
      why: 'a write with no token fetches one first and sends it',
      method: 'POST',
      url: '/api/session',
      token: null,
      sent: [
        { method: 'GET', url: '/api/antiforgery', token: null },
        { method: 'POST', url: '/api/session', token: 'issued-token' },
      ],
    },
    {
      why: 'a DELETE with no token fetches one first',
      method: 'DELETE',
      url: '/api/session',
      token: null,
      sent: [
        { method: 'GET', url: '/api/antiforgery', token: null },
        { method: 'DELETE', url: '/api/session', token: 'issued-token' },
      ],
    },
    {
      why: 'a write with a token cookie goes as it is (Angular adds the header)',
      method: 'POST',
      url: '/api/account/join',
      token: 'cookie-token',
      sent: [{ method: 'POST', url: '/api/account/join', token: null }],
    },
    {
      why: 'a GET needs no token',
      method: 'GET',
      url: '/api/session',
      token: null,
      sent: [{ method: 'GET', url: '/api/session', token: null }],
    },
    {
      why: 'a write outside the API is left alone',
      method: 'POST',
      url: 'https://elsewhere.example/upload',
      token: null,
      sent: [{ method: 'POST', url: 'https://elsewhere.example/upload', token: null }],
    },
  ])('$why', async ({ method, url, token, sent }) => {
    const result = await intercept({ method, url, token });

    expect(result.sent).toEqual(sent);
    expect(result.outcome).toBe('answered');
  });

  it('a write that already carries the header goes as it is', async () => {
    const result = await intercept({ method: 'PUT', url: '/api/profile', header: 'given' });

    expect(result.sent).toEqual([{ method: 'PUT', url: '/api/profile', token: 'given' }]);
  });

  it('when no token arrives, the write goes without one and the API refuses it', async () => {
    const result = await intercept({ method: 'POST', url: '/api/session', issued: null });

    expect(result.sent).toEqual([
      { method: 'GET', url: '/api/antiforgery', token: null },
      { method: 'POST', url: '/api/session', token: null },
    ]);
  });

  it('when fetching the token fails, the write fails with that error and is not sent', async () => {
    const result = await intercept({ method: 'POST', url: '/api/session', tokenStatus: 503 });

    expect(result.sent).toEqual([{ method: 'GET', url: '/api/antiforgery', token: null }]);
    expect(result.outcome).toBeInstanceOf(HttpErrorResponse);
    expect((result.outcome as HttpErrorResponse).status).toBe(503);
  });
});
