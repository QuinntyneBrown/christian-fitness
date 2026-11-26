import type { Request } from '@playwright/test';
import type { ApiHandlers, ApiReply } from './api-handlers';

/** The signed-in member's address, as the form names it (mock `feedback/default`). */
export const MEMBER_EMAIL = 'grace.thompson@gmail.com';

/** The labels the server gives the `about`s the specs use (ADR 0109's table). */
export const ABOUT_LABELS: Record<string, string> = {
  'page:home': 'Home',
  'page:events': 'Events',
  'page:events/series/:id': 'Event series',
  'page:profile': 'Profile',
  'page:stories/:slug': 'Story',
};

/**
 * Answers `GET /api/feedback/form` as the API does (ADR 0109): Grace's address and the label of an
 * `about` in `labels`, else none. Returns the `about` of each request, in order (`null` for none).
 */
export function answerFeedbackForm(
  api: ApiHandlers,
  labels: Record<string, string> = ABOUT_LABELS,
): (string | null)[] {
  const asked: (string | null)[] = [];
  api.on('GET', '/api/feedback/form', (request: Request) => {
    const about = new URL(request.url()).searchParams.get('about');
    asked.push(about);
    const label = about === null ? undefined : labels[about];
    return { json: { email: MEMBER_EMAIL, about: label ? { label } : null } };
  });
  return asked;
}

/** One note as the app sent it: its multipart fields and the screenshot's name and size, if any. */
export interface SentNote {
  kind: string | null;
  text: string | null;
  about: string | null;
  mayEmail: string | null;
  screenshot: { name: string; type: string; size: number } | null;
}

/** Reads the multipart body the app sent to `POST /api/feedback`. */
export function sentNoteOf(request: Request): SentNote {
  const contentType = request.headers()['content-type'] ?? '';
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1] ?? '';
  const body = request.postDataBuffer()?.toString('latin1') ?? '';
  const fields: Record<string, string> = {};
  let screenshot: SentNote['screenshot'] = null;
  for (const part of body.split(`--${boundary}`)) {
    const name = /name="([^"]+)"/.exec(part)?.[1];
    if (!name) continue;
    const value = part.slice(part.indexOf('\r\n\r\n') + 4, part.lastIndexOf('\r\n'));
    if (name === 'screenshot') {
      screenshot = {
        name: /filename="([^"]*)"/.exec(part)?.[1] ?? '',
        type: /Content-Type: (.+)\r\n/.exec(part)?.[1] ?? '',
        size: value.length,
      };
    } else {
      fields[name] = Buffer.from(value, 'latin1').toString('utf8');
    }
  }
  return {
    kind: fields['kind'] ?? null,
    text: fields['text'] ?? null,
    about: fields['about'] ?? null,
    mayEmail: fields['mayEmail'] ?? null,
    screenshot,
  };
}

/**
 * Answers `POST /api/feedback` with 204, or with `reply` when given, and returns each note sent,
 * in order.
 */
export function answerFeedbackSend(
  api: ApiHandlers,
  reply?: () => ApiReply | Promise<ApiReply>,
): SentNote[] {
  const sent: SentNote[] = [];
  api.on('POST', '/api/feedback', (request: Request) => {
    sent.push(sentNoteOf(request));
    return reply ? reply() : { status: 204 };
  });
  return sent;
}

/** A refusal as the API writes it: ProblemDetails with a `code` and, for a field, `fieldCodes`. */
export function feedbackProblem(
  status: number,
  code: string,
  fieldCodes?: Record<string, string>,
): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: fieldCodes ? { status, code, fieldCodes } : { status, code },
  };
}
