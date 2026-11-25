import type { ApiReply } from './api-handlers';

/** One byline as `GET /api/admin/stories/bylines` answers it (ADR 0094). */
export interface BylineFixture {
  id: string;
  name: string;
  bio: string;
  photoKey: string | null;
  stories: number;
}

function byline(n: number, name: string, bio: string, stories: number): BylineFixture {
  return { id: `0193a9c0-0000-7000-8000-0000000b700${n}`, name, bio, photoKey: null, stories };
}

/** The five starting bylines, in name order, with the mock `admin-bylines/default` counts. */
export const CF_TEAM = byline(
  5,
  'CF Team',
  'Notices and event news from the Christian Fitness team.',
  2,
);
export const MARCUS_BELL = byline(
  3,
  'Marcus Bell',
  'Personal trainer who writes beginner guides and profiles of our professionals.',
  2,
);
export const NAOMI_CLARKE = byline(
  1,
  'Naomi Clarke',
  'Writes about community, church sport and the people behind both.',
  2,
);
export const RUTH_ADEYEMI = byline(
  4,
  'Pastor Ruth Adeyemi',
  'Pastor and writer on faith, rest and the body.',
  1,
);
export const PRIYA_RAMAN = byline(
  2,
  'Priya Raman',
  'Nutrition writer and meal-prep volunteer in Mississauga.',
  1,
);

/** The list as mock `admin-bylines/default` draws it. */
export const BYLINES: BylineFixture[] = [
  CF_TEAM,
  MARCUS_BELL,
  NAOMI_CLARKE,
  RUTH_ADEYEMI,
  PRIYA_RAMAN,
];

/** The answer to `GET /api/admin/stories/bylines` holding `bylines`. */
export function bylineList(bylines: BylineFixture[] = BYLINES): ApiReply {
  return { json: { bylines } };
}

/** A ProblemDetails refusal with `code`, as the API answers it. */
export function bylineRefusal(
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
