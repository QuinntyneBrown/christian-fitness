import { test as base, expect, type ConsoleMessage } from '@playwright/test';
import { ApiHandlers } from './api-handlers';

export { expect };
export type { ApiHandler, ApiHandlers, ApiReply } from './api-handlers';
export {
  MODERATOR_SIGNED_IN,
  NO_ADMIN_EVENTS,
  NO_ADMIN_MEMBERS,
  SIGNED_IN,
  STAFF_SIGNED_IN,
  XSRF_TOKEN,
} from './api-handlers';

/** Requests to these path prefixes go to the backend, which never runs in a spec. */
const BACKEND = ['/api/', '/hubs/'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Chromium logs every 4xx or 5xx response, and every request that got no answer, as a console
 * error. For a backend request (or a local chunk while offline) that is what a handler or
 * `context.setOffline` chose, not a fault of the page; an unanswered one is reported below.
 */
function isAnsweredBackendStatus(message: ConsoleMessage, isOffline: boolean): boolean {
  const text = message.text();
  const { url } = message.location();
  if (!url) return false;
  const parsed = new URL(url);
  if (isOffline && text === 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED') {
    return LOCAL_HOSTS.has(parsed.hostname);
  }
  if (
    !text.startsWith('Failed to load resource: the server responded with a status of') &&
    text !== 'Failed to load resource: net::ERR_FAILED' &&
    text !== 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED'
  ) {
    return false;
  }
  return BACKEND.some((prefix) => parsed.pathname.startsWith(prefix));
}

interface Fixtures {
  /** The answers to the app's API requests; register them before the app sends the request. */
  api: ApiHandlers;
}

/**
 * The shared fixture every spec imports `test` and `expect` from (AGENTS.md, "E2E"). It:
 *
 * - answers each backend request (`/api/**`, `/hubs/**`) from the `api` handlers;
 * - fails the spec on an unanswered backend request, on any request off localhost (blocked) and
 *   on a page error (an uncaught exception, or an error the app logs to the console); the
 *   browser's own log of a status a handler answered is not one.
 *
 * A failure names what happened, never a body or a query string.
 */
export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    await use(new ApiHandlers());
  },

  page: async ({ page, api }, use) => {
    const problems: string[] = [];
    const context = page.context();
    const originalSetOffline = context.setOffline.bind(context);
    let isOffline = false;
    // Chromium logs a refused request when the log reaches the page, which can be after the spec
    // is back online; `net::ERR_INTERNET_DISCONNECTED` exists only because the spec went offline.
    let wasOffline = false;
    context.setOffline = async (offline: boolean) => {
      if (offline) {
        // The shell marks itself once the offline screen's lazy chunk (and its imports) has
        // loaded; going offline earlier aborts that fetch and the screen could never open.
        await expect(
          page.locator(
            'cf-admin-shell:not([data-offline-ready]), cf-member-shell:not([data-offline-ready])',
          ),
        ).toHaveCount(0);
      }
      isOffline = offline;
      wasOffline ||= offline;
      await originalSetOffline(offline);
    };

    page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() !== 'error' || isAnsweredBackendStatus(message, wasOffline)) return;
      problems.push(`console error: ${message.text()}`);
    });

    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const what = `${request.method()} ${url.origin}${url.pathname}`;
      if (!LOCAL_HOSTS.has(url.hostname)) {
        problems.push(`request off localhost: ${what}`);
        await route.abort('blockedbyclient');
        return;
      }
      if (BACKEND.some((prefix) => url.pathname.startsWith(prefix))) {
        if (isOffline) {
          await route.abort('internetdisconnected');
          return;
        }
        if (!(await api.answer(route))) {
          problems.push(`unanswered request: ${what}`);
          await route.fulfill({ status: 501, body: 'Not answered by the e2e fixture' });
        }
        return;
      }
      await route.fallback();
    });

    await use(page);

    expect(
      problems,
      'The page made a request no handler answered, left localhost or threw',
    ).toEqual([]);
  },
});
