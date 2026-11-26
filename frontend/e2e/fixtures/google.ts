import type { ApiHandlers } from './api-handlers';

/**
 * Where the e2e fixture's Google lives: a local page standing in for Google's account chooser, so
 * the browser's full-page redirect stays on localhost and nothing is loaded from Google (L2-049
 * AC9; ADR 0099). The address the start answers points here, carrying the attempt's marks as
 * Google's would.
 */
export const FAKE_GOOGLE_PATH = '/api/e2e-google/authorize';

/** What the screen sent to start a Google sign-in. */
export type StartedGoogle = Record<string, unknown>;

/** The member app's start; the admin app passes its own. */
export const MEMBER_GOOGLE_START = '/api/session/google/start';

/**
 * Answers the start (`POST` at `startPath`) with the fake Google's address and answers that page,
 * recording each start's body. `held`, when given, holds the start's answer until it resolves, so
 * a spec can see the button while the page is on its way out.
 */
export function answerGoogleStart(
  api: ApiHandlers,
  held?: Promise<void>,
  startPath: string = MEMBER_GOOGLE_START,
): StartedGoogle[] {
  const started: StartedGoogle[] = [];
  api.on('POST', startPath, async (request) => {
    started.push(request.postDataJSON() as StartedGoogle);
    await held;
    return {
      json: { location: `${FAKE_GOOGLE_PATH}?client_id=e2e&state=e2e-state&nonce=e2e-nonce` },
    };
  });
  api.on('GET', FAKE_GOOGLE_PATH, () => ({
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: Buffer.from(
      '<!doctype html><title>Choose an account</title><main><h1>Choose an account</h1></main>',
    ),
  }));
  return started;
}
