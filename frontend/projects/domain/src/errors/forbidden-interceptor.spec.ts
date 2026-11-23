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
import { ADMINS_ONLY_PATH, FORBIDDEN_PATH, forbiddenInterceptor } from './forbidden-interceptor';

interface Navigation {
  url: string;
  extras: unknown;
}

/** Runs one request through the interceptor; `next` answers with `status`. */
async function intercept(options: {
  method: string;
  url: string;
  status: number;
  routerUrl?: string;
  /** Where a navigation still in flight is going, as a guard holds it. */
  navigatingTo?: string;
  /** The refusal's ProblemDetails code (`not_staff` unless named). */
  code?: string;
}): Promise<{ navigations: Navigation[]; outcome: unknown }> {
  const navigations: Navigation[] = [];
  const router = {
    url: options.routerUrl ?? '/members',
    currentNavigation: () =>
      options.navigatingTo === undefined ? null : { finalUrl: options.navigatingTo },
    serializeUrl: (url: unknown) => url,
    navigateByUrl: (url: string, extras: unknown) => {
      navigations.push({ url, extras });
      return Promise.resolve(true);
    },
  };
  const injector = Injector.create({ providers: [{ provide: Router, useValue: router }] });
  const request = new HttpRequest(options.method, options.url, null);
  const next: HttpHandlerFn = (): Observable<HttpEvent<unknown>> =>
    options.status < 400
      ? of(new HttpResponse({ status: options.status }))
      : throwError(
          () =>
            new HttpErrorResponse({
              status: options.status,
              url: options.url,
              error: { status: options.status, code: options.code ?? 'not_staff' },
            }),
        );
  const result = runInInjectionContext(injector, () => forbiddenInterceptor(request, next));
  const outcome = await firstValueFrom(result).then(
    (event) => event,
    (error: unknown) => error,
  );
  return { navigations, outcome };
}

// L2-047 AC1 and AC3 (ADR 0016): which refusals show "Staff only". One case per row.
describe('forbiddenInterceptor', () => {
  it.each([
    { why: 'a GET of the staff session', url: '/api/admin/session' },
    { why: 'a later admin GET', url: '/api/admin/events' },
    { why: 'an absolute API URL', url: 'http://localhost:4201/api/admin/members' },
  ])('$why answered 403 shows the screen with the current URL', async ({ url }) => {
    const { navigations, outcome } = await intercept({ method: 'GET', url, status: 403 });

    expect(navigations).toEqual([{ url: FORBIDDEN_PATH, extras: { browserUrl: '/members' } }]);
    expect(outcome).toBeInstanceOf(HttpErrorResponse);
  });

  it('a 403 to the guard of a navigation in flight shows the URL asked for', async () => {
    const { navigations } = await intercept({
      method: 'GET',
      url: '/api/admin/session',
      status: 403,
      routerUrl: '/',
      navigatingTo: '/events?page=2',
    });

    expect(navigations).toEqual([
      { url: FORBIDDEN_PATH, extras: { browserUrl: '/events?page=2' } },
    ]);
  });

  it.each([
    {
      why: 'a sign-in refused not_staff (a write)',
      method: 'POST',
      url: '/api/admin/session',
      status: 403,
    },
    { why: 'a PUT', method: 'PUT', url: '/api/admin/events/1', status: 403 },
    { why: 'a PATCH', method: 'PATCH', url: '/api/admin/events/1', status: 403 },
    { why: 'a DELETE', method: 'DELETE', url: '/api/admin/session', status: 403 },
    { why: 'a GET answered 401', method: 'GET', url: '/api/admin/session', status: 401 },
    { why: 'a GET answered 404', method: 'GET', url: '/api/admin/events/9', status: 404 },
    { why: 'a GET answered 500', method: 'GET', url: '/api/admin/session', status: 500 },
    { why: 'a GET outside the API', method: 'GET', url: '/assets/forbidden.json', status: 403 },
    { why: 'a success', method: 'GET', url: '/api/admin/session', status: 200 },
  ])('$why is left alone', async ({ method, url, status }) => {
    const { navigations } = await intercept({ method, url, status });

    expect(navigations).toEqual([]);
  });

  // L2-019 AC5 (ADR 0017): a role the area refuses shows "Admins only" instead.
  it('a GET refused forbidden_role shows "Admins only" with the URL asked for', async () => {
    const { navigations, outcome } = await intercept({
      method: 'GET',
      url: '/api/admin/events',
      status: 403,
      code: 'forbidden_role',
      routerUrl: '/',
      navigatingTo: '/events',
    });

    expect(navigations).toEqual([{ url: ADMINS_ONLY_PATH, extras: { browserUrl: '/events' } }]);
    expect(outcome).toBeInstanceOf(HttpErrorResponse);
  });

  it('a write refused forbidden_role is left to its screen', async () => {
    const { navigations } = await intercept({
      method: 'POST',
      url: '/api/admin/events',
      status: 403,
      code: 'forbidden_role',
    });

    expect(navigations).toEqual([]);
  });

  it.each([
    { why: '"Admins only"', routerUrl: '/admins-only' },
    { why: '"Staff only" with a query', routerUrl: '/forbidden?from=events' },
  ])('does not open a screen over $why', async ({ routerUrl }) => {
    const { navigations } = await intercept({
      method: 'GET',
      url: '/api/admin/services',
      status: 403,
      code: 'forbidden_role',
      routerUrl,
    });

    expect(navigations).toEqual([]);
  });

  it('does not open the screen over itself', async () => {
    const { navigations } = await intercept({
      method: 'GET',
      url: '/api/admin/session',
      status: 403,
      routerUrl: '/forbidden',
    });

    expect(navigations).toEqual([]);
  });
});
