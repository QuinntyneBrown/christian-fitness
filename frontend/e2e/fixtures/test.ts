import { test as base, expect } from '@playwright/test';
import { ApiHandlers } from './api-handlers';

export { expect };
export type { ApiHandler, ApiReply } from './api-handlers';

/** Requests to these path prefixes go to the backend, which never runs in a spec. */
const BACKEND = ['/api/', '/hubs/'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

interface Fixtures {
  /** The answers to the app's API requests; register them before the app sends the request. */
  api: ApiHandlers;
}

/**
 * The shared fixture every spec imports `test` and `expect` from (AGENTS.md, "E2E"). It:
 *
 * - answers each backend request (`/api/**`, `/hubs/**`) from the `api` handlers;
 * - fails the spec on an unanswered backend request, on any request off localhost (blocked) and
 *   on a page error (an uncaught exception, or an error the app logs to the console).
 *
 * A failure names what happened, never a body or a query string.
 */
export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    await use(new ApiHandlers());
  },

  page: async ({ page, api }, use) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
    });

    await page.context().route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const what = `${request.method()} ${url.origin}${url.pathname}`;
      if (!LOCAL_HOSTS.has(url.hostname)) {
        problems.push(`request off localhost: ${what}`);
        await route.abort('blockedbyclient');
        return;
      }
      if (BACKEND.some((prefix) => url.pathname.startsWith(prefix))) {
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
