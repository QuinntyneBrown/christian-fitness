# 0105. Read a story

## Status

Accepted, 26 November 2026 (journey 24, issue 174). Builds on ADR 0047, ADR 0071, ADR 0072,
ADR 0073 and ADR 0097; amends ADR 0073 where it says so below.

## Context

Journey 24 builds the public story page (`L2-061`, `L2-034` AC4–5) on the stories journey 22
wrote. The design (`news/read-story`) was written before journey 22 and differs from what that
journey built, and a few points were left open:

- The design names a `StorySlugRedirect` entity and a server `StoryText` service that splits
  paragraphs and computes the reading time. Journey 22 keeps a published story's former links on
  the story (`FormerSlugs`) and renders the text with one Markdown renderer in the domain library
  (`storyBlocks`, ADR 0097), which the admin preview already uses with a reading time at 200 words
  a minute, not the requirement's 220.
- The header is the design system's `masthead`, which the library does not have; the top bar's
  `site` form draws the same bar (lockup, Sign in, Join free).
- `L2-061` AC13 shows the member navigation to a signed-in member, but the member shell opens only
  with a session.
- ADR 0073 has the API read the built member `index.html` "from a copy or mount in the API
  container"; the API image is built from `backend/` and cannot contain the frontend build.
- ADR 0073 puts the shell endpoint under `public-reads`, but `L2-034` AC4 says opening a story page
  counts as one read, and the page's own API read already counts.
- `L2-061` AC12 asks for "a hashed id kept in local storage" without saying what is hashed or who
  checks it.
- AC5 (Send a correction) is journey 30; the mock's `vetting` state (`/news/how-we-vet-every-listing`)
  is in no acceptance criterion; Subscribe (`/subscribe`) is journey 27.

## Decision

- **Former links.** A former link is one of the story's `FormerSlugs` (ADR 0097); there is no
  separate redirect entity. Publication is checked before a former link is honoured.
- **One renderer, one reading time.** The API answers the story's text as written; the page draws
  it with `storyBlocks`, as the preview does. The reading time is computed once, in the domain
  library's `storyReadingMinutes`: words (white-space separated runs holding a letter or digit, so
  Markdown markers do not count) at 220 a minute, rounded up, at least 1. The admin preview uses
  the same helper, so it now also reads at 220 a minute. The API serves no reading time.
- **The public read.** `GET /api/public/stories/{slug}` (anonymous, `public-reads`) answers
  `PublishedStoryDto`: `id`, current `slug`, `section`, `headline`, `summary`, `author`,
  `publishedAt`, `text`, `image` (key and crop, served by `api/stories/images`), `next` (as the
  preview's, only for a published event or listing with "Next step" words) and `keepReading`. A
  slug that matches no Published story, current or former, is 404 `not_found` with nothing of the
  story. A former link answers the story with its current `slug`; the page replaces the address.
- **Keep reading.** Three other Published stories: those of the same section first, then the
  rest, each group newest first. Each card has `slug`, `section`, `headline`, `author`,
  `publishedAt` and `image`.
- **The masthead.** A visitor's story page is headed by the top bar's `site` form, which draws the
  design system's masthead in its Story variant; the masthead component with its section nav is
  built when the front page needs it (journey 25), rather than a second component for the same bar.
- **Two routes, one page.** `stories/:slug` is routed twice, as the claim link is (ADR 0092): first
  for a visitor (`signedOutGuard`, the page with the masthead), then as a child of the member shell
  (the member navigation). The page is the same lazy component; route data tells it to draw the
  masthead.
- **Copy link.** `CLIPBOARD_SERVICE` (`write(text)` resolving `true` or `false`) is bound on the
  page to `NavigatorClipboard`. "Link copied" holds for 2,000 ms through the domain's `CopiedFlag`,
  disposed with the page. When the clipboard refuses, the story shows the address in a read-only
  field, focused and selected.
- **The shell.** The member nginx server proxies `^/stories/[^/]+$` to the API's anonymous
  `GET /stories/{slug}` before the SPA fallback, hiding the API's own security headers and adding
  the static host's (`headers.conf`). The API reads the shell over loopback from the web container
  of the same replica (`StoryShell__Url`, `http://127.0.0.1:8080/index.html` in the container app)
  the first time it needs it, and keeps it for the life of the process; the shell therefore always
  comes from the same build as the assets nginx serves, which is what ADR 0073 asked a copy or
  mount to guarantee. When the shell cannot be read the endpoint answers 503 and nginx serves its
  own `index.html` (the story still opens, without preview metadata); it never serves another
  build's shell. Values are encoded with `HtmlEncoder.Default`. Every answer is `no-store`.
- **What counts.** The shell request is not under `public-reads` (amending ADR 0073): opening a
  story counts once, through the page's API read (`L2-034` AC4). The read count (`POST
  /api/public/stories/{id}/reads`) and the image are not counted either.
- **Reads.** The browser keeps, in local storage under `cf-story-reads`, the SHA-256 of each story
  id it counted with the time it counted it, so the stored list names no story in clear. A story
  counted in the last 24 hours is not sent again; entries older than 24 hours are dropped on each
  write, so the list stays bounded. No cookie is set and nothing identifying the browser leaves it.
  The API adds one to the story's tally for the current Toronto day (`StoryReadTally`), only for a
  Published story and not for a known crawler's or link previewer's user agent, nor a request
  naming none (`StoryReaders`); anything else is a silent 204. The tally is keyed by story and
  day and its count is the concurrency token, so a read that loses a race to another reads the
  tally again and adds itself. The admin preview never counts. Stories' Reads column sums the
  tallies.
- **Deferred.** Send a correction (AC5) is journey 30; the vetting address is not built; the
  Weekly box leads to `/subscribe`, which journey 27 builds.

## Consequences

- The page, the preview and the rule share one renderer and one reading time; the server has no
  copy to keep in step.
- A shell fetched over loopback costs one local request per API process. A replica whose web
  container is not yet up answers 503 for the first direct story request, which nginx turns into
  the plain app; the next request reads the shell.
- A browser that clears its storage, or a script that posts directly, can count a read again; the
  tallies are an editorial measure, not an audit, and the post reveals nothing.
