# 0108. Follow stories by RSS

## Status

Accepted, 26 November 2026 (journey 26, issue 176). Builds on ADR 0069, ADR 0072 and ADR 0105;
settles the feed freshness question ADR 0069 left open.

## Context

Journey 26 serves the RSS feeds of `L2-060` and names them on the landing page. The design
(`news/publish-rss-feeds`) and ADR 0072 decide the routes, the `public-reads` limit and a 15-minute
output cache evicted by tag, but leave these open:

- ADR 0069 notes that a feed kept for 15 minutes can stay stale past a story's scheduled time,
  although a fresh read already treats the story as Published, and asks the implementation to
  resolve that against `L2-069`'s "within a minute".
- The design's `ETag` is a hash of the items' ids and `EditedAt`, and its `Last-Modified` the newest
  of those instants. A story that leaves a feed (unpublished, or moved to another section) can make
  that date go back, so a reader sending only `If-Modified-Since` would be told 304 wrongly; a
  renamed byline changes an item without changing `EditedAt`.
- The footer's RSS link and the Subscribe page's feed list lead to `/subscribe#rss`, which journey
  27 builds. The news footer of the mock also links to the newsletter (journey 27) and Send
  feedback (journey 30), which do not exist yet.
- The `feed-list` design-system component belongs to Subscribe's feed list, deferred to journey 27.

## Decision

- **Feeds.** `FeedsController` answers `GET /feed` and `GET /{section}/feed` outside `/api`
  (`[AllowAnonymous]`, `public-reads`), so the antiforgery token cookie, set only on `/api`
  answers, is never set. `StoryFeeds` in the domain lists All stories and the five section feeds by
  slug (`events`, `training`, `nutrition`, `faith-body`, `community`); any other slug, Pros
  included, is 404 `not_found`. `GetStoryFeedQuery` reads the 30 newest stories through
  `PublishedStories.At` (journey 24's shared query, so a due Scheduled story is Published at its
  scheduled time) and `RssFeedResult` writes RSS 2.0 with `XmlWriter`: the channel's `title`
  ("Christian Fitness: All stories"), `link` (the member app), `description`, `language` (`en-ca`)
  and `atom:link rel="self"`, and each item's `title`, `link`, `description` (the summary),
  `category` (the section's name, "Faith & Body" for `faith-body`), `dc:creator` (the byline),
  `pubDate` (RFC 1123, UTC) and `guid isPermaLink="false"` (`urn:uuid:<story id>`). Addresses come
  from `MemberApp:BaseUrl`, never from the request.
- **Validators.** The `ETag` is strong: SHA-256 over each item's id, `EditedAt`, publication time
  and author name, the first 16 bytes in hex. `Last-Modified` is the newest `ActivityAt` (or due
  scheduled time) of any story that has ever gone out, across every section, so it moves on when
  a story is edited, published, unpublished or moved, in every feed. It over-approximates for a
  section feed (a reader may get a 200 that a narrower date would have spared) but never answers
  304 to a changed feed. `If-None-Match`, when sent, decides alone (weak comparison, `*` matches);
  otherwise `If-Modified-Since` at or after `Last-Modified`, to the second, is 304. A 304 carries
  the validators and `Cache-Control: public, max-age=900` and no body.
- **Output cache.** The `feeds` output-cache policy keeps a 200 without `Set-Cookie` for 15
  minutes, keyed by its path only (a query string never makes another copy) and tagged with its
  lower-cased path. `UseOutputCache` runs after `UseRateLimiter`, so a kept feed still counts
  against `public-reads`. A kept feed answers matching validators with 304 itself. `IStoryFeedCache`
  (Application) evicts by tag; the Api binds it to `IOutputCacheStore.EvictByTagAsync`.
- **Eviction.** Publish now (including Approve & publish), Update and Unpublish evict `/feed` and
  the feed of the story's section before and after the change. The cache lives in one API process,
  as ADR 0072 expects for the single replica.
- **Scheduled stories (ADR 0069).** The publishing clock's story job evicts the same tags for each
  story it stores as Published. A kept feed therefore shows a due story at the next tick, at most
  30 seconds after its time while the clock holds the lease, which is within `L2-069`'s minute; a
  feed rendered after the time already shows it, through the shared query. A reader's or an
  intermediary's own copy may still be up to 900 seconds old, as ADR 0072 accepts.
- **Discovery.** The member app's `index.html` names the six feeds with
  `<link rel="alternate" type="application/rss+xml">`, titled as their channels, so every page
  served from it, the landing page included, names them. The design system's footer gains its
  news variant (`variant="news"`, block `site-footer` with `site-footer__links`) on the landing
  page: the copyright line, then RSS with its mark, Privacy and Terms. Until journey 27 builds
  Subscribe, RSS leads to `/feed`; journey 27 points it at `/subscribe#rss`. Newsletter and Send
  feedback join the footer with the journeys that build their pages.
- **Deferred.** Subscribe's feed list, `ListFeedsQuery` with stories a week, Copy URL, Open in
  Feedly and the `feed-list` component (`L2-060` AC4, AC5) are journey 27's.

## Consequences

- Feed readers poll cheaply: a kept feed is served without a database read, and a reader holding
  the current validators receives 304 without a body.
- A story change evicts at most three entries; a change to a byline's name is seen when the kept
  feed expires, within 15 minutes, since bylines evict nothing.
- A second API replica would keep its own feeds and miss another replica's evictions; it needs a
  shared output-cache store (ADR 0072).
