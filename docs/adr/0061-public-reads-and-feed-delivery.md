# 0061. Public reads and feed delivery

## Status

Accepted, 24 November 2026.

## Context

`L2-060` calls for the same rate limit on feeds as other public reads, but `L2-034` did not
define one. Feed readers poll without a session and may share an IP address with other readers.
The member app and API share an origin; nginx currently proxies `/api/` only, so a request for
`/events/feed` would reach the SPA's `events/:id` route instead of the feed.

## Decision

- **Public reads.** The named ASP.NET Core rate-limiter policy `public-reads` covers anonymous
  story, section, directory and feed reads. It permits 120 requests per minute per client IP in a
  sliding window of six segments. Opening a story page counts as one read. A refusal is HTTP 429
  ProblemDetails with code `too_many_requests` and a `Retry-After` header. The API uses the client
  address forwarded by the trusted proxy, not an arbitrary client-supplied header (ADR 0047).
- **Feed routes.** The future nginx configuration copied by `frontend/Dockerfile` proxies exact
  `/feed` and `~ ^/[a-z0-9-]+/feed$` to the API ahead of the SPA fallback. The API accepts the
  five section slugs in `L2-060` AC1; an unknown section returns 404, not the SPA. The proxy
  preserves the path and forwards the client address and scheme as it does for `/api/`.
- **Feed cache.** The API output-caches each rendered feed for 15 minutes and sends
  `Cache-Control: public, max-age=900`. Publishing or unpublishing a story evicts the affected
  feed entries by tag; editing a published story also evicts them so its content and validators
  are refreshed. Conditional requests still receive 304 without a body when their validators
  match. Pros stories appear in All stories; Pros has no separate feed.

## Consequences

- An API cache hit avoids rendering the feed again. A reader or shared HTTP cache may also serve
  a fresh response without contacting the API. API output caching alone does not guarantee that
  requests from a shared IP avoid the rate limit: requests reaching the API count, including
  cached feed responses. A reader polling every 15 minutes uses one request per poll, but enough
  readers behind one IP can still exceed 120 requests in a minute.
- Evicting the API's cache does not purge a reader or intermediary's fresh response; those caches
  may serve it for up to 900 seconds. The API refreshes its own affected entries after eviction.
- These are design decisions for later implementation, not a description of deployed behaviour.
  The current single-replica deployment has a local cache; additional replicas need coordinated
  invalidation and rate-limit accounting.
