import { ErrorScreen } from './error-screen';

/** What the server-error screen of either app is opened with. */
export interface ServerErrorParams {
  /** The reference the failed response carried, if any. */
  reference?: string;
  /** The URL that failed, which "Try again" loads again. */
  from?: string;
}

/**
 * The server-error screen of either app. `open` navigates the way `serverErrorInterceptor` does:
 * to `/server-error` with the reference and the URL that failed as query parameters.
 */
export abstract class ServerErrorScreen extends ErrorScreen {
  async open(params: ServerErrorParams = {}): Promise<void> {
    const query = new URLSearchParams();
    if (params.reference !== undefined) query.set('reference', params.reference);
    if (params.from !== undefined) query.set('from', params.from);
    const search = query.toString();
    await this.page.goto(`/server-error${search ? `?${search}` : ''}`);
  }
}
