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
import { serverErrorInterceptor } from './server-error-interceptor';

interface Navigation {
  commands: unknown[];
  extras: unknown;
}

/** Runs one request through the interceptor; `next` answers with `status` and `body`. */
async function intercept(options: {
  method: string;
  url: string;
  status: number;
  body?: unknown;
  routerUrl?: string;
  /** Where a navigation still in flight is going, as a guard holds it. */
  navigatingTo?: string;
}): Promise<{ navigations: Navigation[]; outcome: unknown }> {
  const navigations: Navigation[] = [];
  const router = {
    url: options.routerUrl ?? '/events/42',
    currentNavigation: () =>
      options.navigatingTo === undefined ? null : { finalUrl: options.navigatingTo },
    serializeUrl: (url: unknown) => url,
    navigate: (commands: unknown[], extras: unknown) => {
      navigations.push({ commands, extras });
      return Promise.resolve(true);
    },
  };
  const injector = Injector.create({ providers: [{ provide: Router, useValue: router }] });
  const request = new HttpRequest(options.method, options.url, null);
  const next: HttpHandlerFn = (): Observable<HttpEvent<unknown>> =>
    options.status >= 200 && options.status < 400
      ? of(new HttpResponse({ status: options.status, body: options.body }))
      : throwError(
          () =>
            new HttpErrorResponse({
              status: options.status,
              url: options.url,
              error: options.body,
            }),
        );
  const result = runInInjectionContext(injector, () => serverErrorInterceptor(request, next));
  const outcome = await firstValueFrom(result).then(
    (event) => event,
    (error: unknown) => error,
  );
  return { navigations, outcome };
}

const PROBLEM = { status: 500, code: 'server_error', reference: 'CF-4BF92F35' };

// L2-043 AC4 and AC5: which failures show the server-error screen. One case per row.
describe('serverErrorInterceptor', () => {
  it.each([
    {
      why: 'a GET to the API answering 500 with a reference',
      method: 'GET',
      url: '/api/events/42',
      status: 500,
      body: PROBLEM,
      queryParams: { reference: 'CF-4BF92F35', from: '/events/42' },
    },
    {
      why: 'a GET answering 503 with no body',
      method: 'GET',
      url: '/api/events',
      status: 503,
      body: null,
      queryParams: { from: '/events/42' },
    },
    {
      why: 'a GET answering 500 with a malformed reference',
      method: 'GET',
      url: '/api/events',
      status: 500,
      body: { reference: '<b>call us</b>' },
      queryParams: { from: '/events/42' },
    },
    {
      why: 'an absolute URL to the API',
      method: 'GET',
      url: 'http://localhost:4200/api/events?when=week',
      status: 502,
      body: PROBLEM,
      queryParams: { reference: 'CF-4BF92F35', from: '/events/42' },
    },
  ])('shows the screen for $why', async ({ method, url, status, body, queryParams }) => {
    const { navigations, outcome } = await intercept({ method, url, status, body });

    expect(navigations).toEqual([
      { commands: ['/server-error'], extras: { skipLocationChange: true, queryParams } },
    ]);
    expect(outcome).toBeInstanceOf(HttpErrorResponse);
    expect((outcome as HttpErrorResponse).status).toBe(status);
  });

  it.each([
    {
      why: 'a POST (the screen shows its failed save)',
      method: 'POST',
      url: '/api/events',
      status: 500,
    },
    { why: 'a PUT', method: 'PUT', url: '/api/events/42', status: 500 },
    { why: 'a PATCH', method: 'PATCH', url: '/api/events/42', status: 500 },
    { why: 'a DELETE', method: 'DELETE', url: '/api/events/42', status: 500 },
    { why: 'a 404', method: 'GET', url: '/api/events/42', status: 404 },
    { why: 'a 499, below 500', method: 'GET', url: '/api/events/42', status: 499 },
    { why: 'no answer (offline is slice 30.2)', method: 'GET', url: '/api/events/42', status: 0 },
    { why: 'a request outside the API', method: 'GET', url: '/assets/i18n.json', status: 500 },
    {
      why: 'a path that only starts like the API',
      method: 'GET',
      url: '/apiary/hives',
      status: 500,
    },
  ])('passes the failure on without the screen for $why', async ({ method, url, status }) => {
    const { navigations, outcome } = await intercept({ method, url, status, body: PROBLEM });

    expect(navigations).toEqual([]);
    expect(outcome).toBeInstanceOf(HttpErrorResponse);
    expect((outcome as HttpErrorResponse).status).toBe(status);
  });

  it('while a guard holds a navigation, "from" is where it was going', async () => {
    const { navigations } = await intercept({
      method: 'GET',
      url: '/api/session',
      status: 500,
      body: PROBLEM,
      routerUrl: '/',
      navigatingTo: '/home',
    });

    expect(navigations).toEqual([
      {
        commands: ['/server-error'],
        extras: {
          skipLocationChange: true,
          queryParams: { reference: 'CF-4BF92F35', from: '/home' },
        },
      },
    ]);
  });

  it('does not open the screen again while it is showing', async () => {
    const { navigations, outcome } = await intercept({
      method: 'GET',
      url: '/api/messages/unread-count',
      status: 500,
      body: PROBLEM,
      routerUrl: '/server-error?reference=CF-00000000&from=%2Fevents%2F42',
    });

    expect(navigations).toEqual([]);
    expect(outcome).toBeInstanceOf(HttpErrorResponse);
  });

  it('lets a success through untouched', async () => {
    const { navigations, outcome } = await intercept({
      method: 'GET',
      url: '/api/events',
      status: 200,
      body: { items: [] },
    });

    expect(navigations).toEqual([]);
    expect((outcome as HttpResponse<unknown>).body).toEqual({ items: [] });
  });
});
