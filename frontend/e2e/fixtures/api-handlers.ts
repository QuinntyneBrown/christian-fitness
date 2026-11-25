import type { Request, Route } from '@playwright/test';
import { NOTHING_AWAITING, QUIET_WEEKS } from './admin-dashboard';
import { NO_APPLICATIONS } from './admin-applications';
import { TEAM_HOST } from './admin-events';
import { NO_LISTINGS } from './admin-listings';
import { NO_NOTIFICATIONS } from './notifications';
import { NO_DIRECTORY } from './directory';
import { NO_SERVICES } from './services';

/**
 * What a handler answers: a status (200 unless given) and a JSON body, raw bytes (`body`, such as
 * an image), or no body; or, with `abort`, no answer at all, as when the network drops (the request
 * fails with status 0).
 */
export interface ApiReply {
  status?: number;
  json?: unknown;
  body?: Buffer;
  headers?: Record<string, string>;
  abort?: boolean;
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

/** The hub's answer to SignalR's negotiate request (ADR 0039): WebSockets, no real server behind. */
export const NEGOTIATED = {
  negotiateVersion: 1,
  connectionId: 'e2e-connection',
  connectionToken: 'e2e-token',
  availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
};

/** The signed-in member the fixture answers `GET /api/session` with unless a spec says otherwise. */
export const SIGNED_IN = {
  memberId: '0190c0de-0000-7000-8000-000000000001',
  name: 'Grace Thompson',
};

/**
 * The signed-in staff member the fixture answers `GET /api/admin/session` with unless a spec says
 * otherwise (ADR 0011).
 */
export const STAFF_SIGNED_IN = {
  memberId: '0190c0de-0000-7000-8000-000000000002',
  name: 'Dana Reyes',
  role: 'Admin',
};

/** A signed-in Moderator, for a spec to answer `GET /api/admin/session` with (L2-019; ADR 0020). */
export const MODERATOR_SIGNED_IN = {
  memberId: '0190c0de-0000-7000-8000-000000000003',
  name: 'Joel Mensah',
  role: 'Moderator',
};

/** The staff list of events the fixture answers unless a spec says otherwise: no events yet. */
export const NO_ADMIN_EVENTS = {
  counts: { all: 0, published: 0, draft: 0 },
  events: [],
};

/** The staff list of members the fixture answers unless a spec says otherwise: nobody yet. */
export const NO_ADMIN_MEMBERS = { total: 0, matches: 0, page: 1, pageSize: 25, members: [] };

/**
 * The answers a spec gives to the app's API requests. A spec registers a handler with `on`; the
 * latest registration for a method and path wins, so a spec can override a default. A request
 * no handler matches is unanswered, and the shared fixture fails the spec for it.
 *
 * Defaults, which any spec can override: `GET /api/antiforgery` sets the token cookie, and
 * `GET /api/session` answers a signed-in Grace, so `memberAuthGuard` lets a member route open, and
 * `GET /api/admin/session` answers a signed-in Dana, so `staffAuthGuard` lets an admin route open,
 * and `GET /api/admin/events` answers no events, so the Events page opens empty (ADR 0021), and
 * `GET /api/admin/events/hosts/default` answers the team listing, a new event's host (ADR 0089), and
 * `GET /api/admin/members` answers no members, so the Members page opens empty (ADR 0022), and
 * `GET /api/admin/dashboard/activity` answers eight quiet weeks, so the Dashboard opens empty (ADR 0000), and
 * `GET /api/admin/dashboard/awaiting` answers nothing waiting (ADR 0060), and
 * `GET /api/admin/services/applications` answers an empty queue (ADR 0049), and
 * `GET /api/services` answers nobody listed, so Services opens empty (ADR 0051), and
 * `GET /api/services/{id}` answers 404 `service_not_found` (ADR 0052), and
 * `GET /api/home` answers no next event and no suggestions, so Home opens empty (ADR 0044), and
 * `GET /api/notifications` answers nothing yet, so the member shell's bell has no badge (ADR 0083).
 * `GET /api/directory` answers nobody listed, so the Directory opens empty (ADR 0082).
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
    { method: 'GET', path: '/api/admin/session', handler: () => ({ json: STAFF_SIGNED_IN }) },
    { method: 'GET', path: '/api/admin/events', handler: () => ({ json: NO_ADMIN_EVENTS }) },
    {
      method: 'GET',
      path: '/api/admin/events/hosts/default',
      handler: () => ({ json: TEAM_HOST }),
    },
    { method: 'GET', path: '/api/public/events/upcoming', handler: () => ({ json: [] }) },
    { method: 'GET', path: '/api/public/services/featured', handler: () => ({ json: [] }) },
    { method: 'GET', path: '/api/admin/members', handler: () => ({ json: NO_ADMIN_MEMBERS }) },
    {
      method: 'GET',
      path: '/api/admin/dashboard/activity',
      handler: () => ({ json: { weeks: QUIET_WEEKS } }),
    },
    {
      method: 'GET',
      path: '/api/admin/dashboard/awaiting',
      handler: () => ({ json: NOTHING_AWAITING }),
    },
    {
      method: 'GET',
      path: '/api/admin/services/applications',
      handler: () => ({ json: NO_APPLICATIONS }),
    },
    {
      method: 'GET',
      path: '/api/admin/services/listings',
      handler: () => ({ json: NO_LISTINGS }),
    },
    { method: 'GET', path: '/api/services', handler: () => ({ json: NO_SERVICES }) },
    {
      method: 'GET',
      path: /^\/api\/services\/[0-9a-f-]{36}$/,
      handler: () => ({ status: 404, json: { code: 'service_not_found' } }),
    },
    {
      method: 'GET',
      path: '/api/home',
      handler: () => ({ json: { nextEvent: null, suggested: [], unreadCount: 0 } }),
    },
    { method: 'GET', path: '/api/directory', handler: () => ({ json: NO_DIRECTORY }) },
    {
      method: 'GET',
      path: '/api/conversations',
      handler: () => ({ json: { conversations: [] } }),
    },
    { method: 'GET', path: '/api/notifications', handler: () => ({ json: NO_NOTIFICATIONS }) },
    // The member shell's one real-time connection (ADR 0083); the socket is the fixture's quiet hub.
    { method: 'POST', path: '/api/chat/negotiate', handler: () => ({ json: NEGOTIATED }) },
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
    if (reply.abort) {
      await route.abort('failed');
      return true;
    }
    await route.fulfill({
      status: reply.status ?? 200,
      headers: reply.headers,
      ...(reply.json === undefined ? {} : { json: reply.json }),
      ...(reply.body === undefined ? {} : { body: reply.body }),
    });
    return true;
  }
}
