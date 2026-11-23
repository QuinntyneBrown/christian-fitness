import {
  type HttpEvent,
  HttpErrorResponse,
  HttpRequest,
  HttpResponse,
  type HttpHandlerFn,
} from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, type Observable, of, throwError } from 'rxjs';
import {
  isSessionExpired,
  SESSION_EXPIRED_STATE,
  sessionEndingOf,
  sessionExpiredInterceptor,
} from './session-expiry';

interface Navigation {
  url: string;
  extras: unknown;
}

/** Runs one request through the interceptor; `next` answers with `status` and `body`. */
async function intercept(options: {
  method?: string;
  url: string;
  status: number;
  body?: unknown;
  routerUrl?: string;
}): Promise<{ navigations: Navigation[]; outcome: unknown }> {
  const navigations: Navigation[] = [];
  const router = {
    url: options.routerUrl ?? '/events',
    navigateByUrl: (url: string, extras: unknown) => {
      navigations.push({ url, extras });
      return Promise.resolve(true);
    },
  };
  const injector = Injector.create({ providers: [{ provide: Router, useValue: router }] });
  const request = new HttpRequest(options.method ?? 'GET', options.url, null);
  const next: HttpHandlerFn = (): Observable<HttpEvent<unknown>> =>
    options.status < 400
      ? of(new HttpResponse({ status: options.status, body: options.body }))
      : throwError(
          () =>
            new HttpErrorResponse({
              status: options.status,
              url: options.url,
              error: options.body,
            }),
        );
  const result = runInInjectionContext(injector, () => sessionExpiredInterceptor(request, next));
  const outcome = await firstValueFrom(result).then(
    (event) => event,
    (error: unknown) => error,
  );
  return { navigations, outcome };
}

const EXPIRED = { status: 401, code: 'session_expired' };

// L2-018 AC5 (ADR 0016): which answers return staff to Staff sign in. One case per row.
describe('sessionExpiredInterceptor', () => {
  it.each([
    { why: 'a GET of the staff session', method: 'GET', url: '/api/admin/session' },
    { why: 'a later admin GET', method: 'GET', url: '/api/admin/events' },
    { why: 'an admin write', method: 'POST', url: '/api/admin/events' },
    { why: 'an absolute admin URL', method: 'GET', url: 'http://localhost:4201/api/admin/session' },
  ])('$why refused session_expired opens Staff sign in saying why', async ({ method, url }) => {
    const { navigations, outcome } = await intercept({ method, url, status: 401, body: EXPIRED });

    expect(navigations).toEqual([{ url: '/sign-in', extras: { state: SESSION_EXPIRED_STATE } }]);
    expect(outcome).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    {
      why: 'a 401 with another code',
      url: '/api/admin/session',
      status: 401,
      body: { code: 'unauthenticated' },
    },
    { why: 'a 401 with no body', url: '/api/admin/session', status: 401, body: null },
    {
      why: 'a wrong code at sign-in',
      url: '/api/admin/session/two-step',
      status: 401,
      body: { code: 'invalid_code' },
    },
    {
      why: 'a 403 with the code',
      url: '/api/admin/session',
      status: 403,
      body: { code: 'session_expired' },
    },
    { why: 'a request outside the admin API', url: '/api/session', status: 401, body: EXPIRED },
    { why: 'a success', url: '/api/admin/session', status: 200, body: {} },
  ])('$why is left alone', async ({ url, status, body }) => {
    const { navigations } = await intercept({ url, status, body });

    expect(navigations).toEqual([]);
  });

  it('does not open Staff sign in over itself', async () => {
    const { navigations } = await intercept({
      url: '/api/admin/session',
      status: 401,
      body: EXPIRED,
      routerUrl: '/sign-in?x=1',
    });

    expect(navigations).toEqual([]);
  });
});

describe('isSessionExpired', () => {
  it.each([
    { error: new HttpErrorResponse({ status: 401, error: EXPIRED }), expected: true },
    {
      error: new HttpErrorResponse({ status: 401, error: { code: 'unauthenticated' } }),
      expected: false,
    },
    { error: new HttpErrorResponse({ status: 401, error: 'session_expired' }), expected: false },
    { error: new HttpErrorResponse({ status: 500, error: EXPIRED }), expected: false },
    { error: { status: 401, code: 'session_expired' }, expected: false },
    { error: null, expected: false },
  ])('$error.status is $expected', ({ error, expected }) => {
    expect(isSessionExpired(error)).toBe(expected);
  });
});

describe('sessionEndingOf', () => {
  it.each([
    { state: { session: 'expired' }, expected: 'expired' },
    { state: { session: 'locked' }, expected: null },
    { state: { session: 'Expired' }, expected: null },
    { state: { twoStep: 'expired' }, expected: null },
    { state: 'expired', expected: null },
    { state: null, expected: null },
    { state: undefined, expected: null },
  ])('$state is $expected', ({ state, expected }) => {
    expect(sessionEndingOf(state)).toBe(expected);
  });
});
