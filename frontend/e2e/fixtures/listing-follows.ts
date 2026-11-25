import type { ApiHandlers, ApiReply } from './api-handlers';

/** One follow or unfollow the app sent, as the spec reads it. */
export interface FollowRequest {
  method: 'PUT' | 'DELETE';
  id: string;
}

/** The answer to one request: the API's, a refusal by status and code, or no answer. */
export type FollowFault = {
  status?: number;
  code?: string;
  abort?: boolean;
  hold?: Promise<void>;
} | null;

/** Where a listing stands for the signed-in member before the spec presses anything. */
export interface FollowStart {
  id: string;
  following: boolean;
  followers: number;
}

/**
 * Answers `PUT` and `DELETE /api/directory/{id}/follow` as the API does (ADR 0088): the member's
 * state and the count after the change, a repeat changing nothing, from where each listing in
 * `start` stands (an id not among them is 404 `listing_not_found`). `fault` may refuse a request,
 * by its zero-based number, or hold it until a promise settles. Returns the requests, in order.
 */
export function answerListingFollows(
  api: ApiHandlers,
  start: FollowStart[],
  fault: (requestNumber: number) => FollowFault = () => null,
): FollowRequest[] {
  const asked: FollowRequest[] = [];
  const state = new Map(start.map((listing) => [listing.id, { ...listing }]));
  const problem = (status: number, code: string): ApiReply => ({
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { status, code },
  });
  for (const method of ['PUT', 'DELETE'] as const) {
    api.on(
      method,
      /^\/api\/directory\/[0-9a-f-]{36}\/follow$/,
      async (request): Promise<ApiReply> => {
        const number = asked.length;
        const id = new URL(request.url()).pathname.split('/')[3] ?? '';
        asked.push({ method, id });
        const refusal = fault(number);
        if (refusal?.hold) await refusal.hold;
        if (refusal?.abort) return { abort: true };
        if (refusal?.status) return problem(refusal.status, refusal.code ?? 'error');
        const listing = state.get(id);
        if (!listing) return problem(404, 'listing_not_found');
        const following = method === 'PUT';
        if (listing.following !== following) {
          listing.followers += following ? 1 : -1;
          listing.following = following;
        }
        return { json: { following: listing.following, followers: listing.followers } };
      },
    );
  }
  return asked;
}
