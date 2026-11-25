# 0063. Story link previews and redirects

## Status

Accepted, 24 November 2026. Documentation decision; implementation follows in later slices.

## Context

`L2-061` AC11 asks for a shared story link to preview as the story. The member app is a
client-rendered SPA; crawlers that do not run JavaScript cannot see the title and description set
by `StoryPage`. The client-side replacement of a former slug (`L2-061` AC8) likewise cannot redirect
such a crawler. The web front is nginx, with the API in the same replica (ADR 0047).

## Decision

- **Serve the shell, not SSR or prerendering.** On the member origin nginx proxies
  `/stories/*` to an anonymous API endpoint before the SPA fallback. For a current slug of a
  Published story, the endpoint returns the built member `index.html` with the story's headline
  in `<title>`, summary in `<meta name="description">`, Open Graph and Twitter title,
  description and lead-image tags, and a canonical link to the current story address. The
  image and canonical URLs are absolute, using `MemberApp__BaseUrl`, not an
  untrusted request host. A missing summary yields an empty description. Values are encoded for
  their HTML text or attribute context; editor-supplied text is never inserted as markup.
- **Keep the SPA bootable.** The API reads the built member `index.html` once at startup, from
  a copy or mount in the API container, and preserves its hashed asset references. Each response
  derives from that unmodified shell, without retaining another story's metadata. A browser
  boots the SPA normally; the endpoint does not render the article body.
- **Redirect and not found.** A former slug of a currently Published story gets HTTP 301 with
  `Location` set to its current `/stories/<slug>` address. In-app navigation also replaces the
  URL after resolving a former slug. An unknown slug, or one belonging to a story that is not
  Published, returns the unmodified shell with HTTP 404 and no story metadata. Publication is
  checked before redirecting, so a former slug cannot disclose an unpublished story.
- **Deployment.** The API's shell must be from the same frontend build as the assets served by
  nginx; release both together. The startup read and the nginx route are documented in
  `docs/operations/deployment.md`. The endpoint is a public story read and is subject to the
  public-read policy. Shell and redirect responses use `Cache-Control: no-store`, so a cached
  response does not continue to expose metadata or redirect after unpublication; the feed cache
  decision does not apply to them. nginx keeps the member app's security headers on these responses.

## Consequences

- Crawlers receive preview metadata and a server redirect without executing the SPA. The
  article body remains client-rendered, so this is not full server-side rendering.
- This adds no SSR runtime or preview library to the browser. The story route remains lazy and
  the decision does not raise the member app's initial budget: `frontend/angular.json` sets
  280 kB warning and 290 kB error. When implemented, compare the production initial bundle to
  its base and keep it within those budgets; this documentation-only decision has no measured
  bundle change.
- A release must keep the shell and hashed assets in step; an unavailable shell must not silently
  serve a mismatched or stale build.
