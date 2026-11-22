import type { Request, Route } from '@playwright/test';

/** What a handler answers: a status (200 unless given) and a JSON body, or no body. */
export interface ApiReply {
  status?: number;
  json?: unknown;
  headers?: Record<string, string>;
}

/** Answers one API request. It receives the request as the app sent it. */
export type ApiHandler = (request: Request) => ApiReply | Promise<ApiReply>;

interface Registration {
  method: string;
  path: string | RegExp;
  handler: ApiHandler;
}

/** The antiforgery token the fixture hands out, as the API's `__Host-cf-xsrf` cookie (ADR 0009). */
export const XSRF_TOKEN = 'e2e-xsrf-token';

/** The signed-in member the fixture answers `GET /api/session` with unless a spec says otherwise. */
export const SIGNED_IN = {
  memberId: '0190c0de-0000-7000-8000-000000000001',
  name: 'Grace Thompson',
};

/**
 * The answers a spec gives to the app's API requests. A spec registers a handler with `on`; the
 * latest registration for a method and path wins, so a spec can override a default. A request
 * no handler matches is unanswered, and the shared fixture fails the spec for it.
 *
 * Defaults, which any spec can override: `GET /api/antiforgery` sets the token cookie, and
 * `GET /api/session` answers a signed-in Grace, so `memberAuthGuard` lets a member route open.
 */
export class ApiHandlers {
  private readonly registrations: Registration[] = [
    {
      method: 'GET',
      path: '/api/antiforgery',
      handler: () => ({
        status: 204,
        headers: { 'set-cookie': `__Host-cf-xsrf=${XSRF_TOKEN}; Path=/; Secure; SameSite=Strict` },
      }),
    },
    { method: 'GET', path: '/api/session', handler: () => ({ json: SIGNED_IN }) },
  ];

  /** Answers `method` requests to `path` (exact pathname, or a pattern over it) with `handler`. */
  on(method: string, path: string | RegExp, handler: ApiHandler): void {
    this.registrations.unshift({ method: method.toUpperCase(), path, handler });
  }

  /** Fulfils the route from the first matching handler. Returns false when none matches. */
  async answer(route: Route): Promise<boolean> {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const match = this.registrations.find(
      (r) =>
        r.method === request.method() &&
        (typeof r.path === 'string' ? r.path === pathname : r.path.test(pathname)),
    );
    if (!match) return false;
    const reply = await match.handler(request);
    await route.fulfill({
      status: reply.status ?? 200,
      headers: reply.headers,
      ...(reply.json === undefined ? {} : { json: reply.json }),
    });
    return true;
  }
}
