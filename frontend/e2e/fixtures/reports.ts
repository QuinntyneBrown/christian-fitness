import type { ApiHandlers } from './api-handlers';

/** One report as the page sent it: the message and the body (`{ reason }`). */
export interface ReportSent {
  messageId: string;
  body: unknown;
}

/**
 * Answers `POST /api/messages/{id}/reports` as the API does (ADR 0000): 201 with no body, or each
 * `refusals` entry in turn when given (the last one repeats; once they are used up, none). `hold`
 * keeps an answer back until it settles. Returns what was sent, in order.
 */
export function answerReports(
  api: ApiHandlers,
  refusals: readonly { status: number; code: string }[] = [],
  hold: Promise<void> | null = null,
): ReportSent[] {
  const sent: ReportSent[] = [];
  api.on('POST', /^\/api\/messages\/[0-9a-f-]{36}\/reports$/, async (request) => {
    const messageId = new URL(request.url()).pathname.split('/')[3];
    sent.push({ messageId, body: request.postDataJSON() });
    if (hold) await hold;
    const refusal = refusals[sent.length - 1];
    if (refusal) {
      return {
        status: refusal.status,
        headers: { 'content-type': 'application/problem+json' },
        json: { status: refusal.status, code: refusal.code },
      };
    }
    return { status: 201 };
  });
  return sent;
}
