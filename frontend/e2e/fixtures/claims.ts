import type { ApiHandlers, ApiReply } from './api-handlers';

/** The token of the claim link the specs open (`/claim/{token}`). */
export const CLAIM_TOKEN = 'k3Xq9vTz-claim-token_Ab12';

/** Where the claim screen reads its link (ADR 0091). */
export const CLAIM_PATH = `/api/claims/${CLAIM_TOKEN}`;

/** 9 December 2026 at noon in Toronto: the link's expiry, 14 days after approval. */
export const CLAIM_EXPIRES_AT = '2026-12-09T17:00:00Z';

/** The listing as it will appear (`ClaimPreviewDto`): Eastside Ladies Who Lift, as the mock draws it. */
export const EASTSIDE_PREVIEW = {
  kind: 'organization',
  name: 'Eastside Ladies Who Lift',
  tagline: 'Saturday morning strength group out of Danforth Baptist',
  area: 'East York',
  about:
    'About 25 women, coached by a CSEP trainer. We pray before and after and are so welcoming to beginners.',
  focus: ['Strength', 'Beginners', 'Women'],
  website: 'https://eastsideladies.ca',
  isVerified: true,
  photoKey: null,
};

/** What `GET /api/claims/{token}` answers a visitor: the name and expiry, no preview. */
export const CLAIM_SIGNED_OUT = {
  name: EASTSIDE_PREVIEW.name,
  expiresAt: CLAIM_EXPIRES_AT,
  listing: null,
};

/** What it answers a signed-in member: the name, expiry and the preview. */
export const CLAIM_SIGNED_IN = { ...CLAIM_SIGNED_OUT, listing: EASTSIDE_PREVIEW };

/** A ProblemDetails refusal with `code`, as the API answers one. */
export function refusal(status: number, code: string): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { status, code },
  };
}

/** A visitor: `GET /api/session` is 401 until a sign-in or a join succeeds, then answers Grace. */
export function answerAsVisitor(api: ApiHandlers, signedIn: object): void {
  api.on('GET', '/api/session', () => refusal(401, 'unauthenticated'));
  const signIn = (): ApiReply => {
    api.on('GET', '/api/session', () => ({ json: signedIn }));
    return { json: signedIn };
  };
  api.on('POST', '/api/session', signIn);
  api.on('POST', '/api/account/join', () => ({ status: 201, ...signIn() }));
}
