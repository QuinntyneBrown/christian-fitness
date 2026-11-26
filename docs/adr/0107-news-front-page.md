# 0107. News front page

## Status

Accepted, 26 November 2026 (journey 25, issue 175). Builds on ADR 0069, ADR 0071, ADR 0072,
ADR 0097 and ADR 0105; supersedes ADR 0057 and the layout parts of ADR 0037.

## Context

Journey 25 turns the landing page at `/` into a news front page (`L2-001`, `L2-002`). The design
(`member-access/view-landing-page`) was written before journeys 22 to 24 built stories, and left
several points open or at odds with what was built:

- `L2-001` AC2 says "the newest story leads … the next four show as headlines", while `L2-069` AC6
  says a published story "appears on the front page where Publishing placed it" (Lead story, Top
  headlines, The latest), and journey 22 keeps one Published Lead.
- "The rest follow" states no length; the mocks draw More stories, its loading and failure, and a
  line capping the river at 60 (`AGENTS.md`: bound what grows).
- The design names `GET /api/public/stories/most-read`, but `most-read` is a valid story link
  (`StorySlug`), so that address would hide a story's API read.
- The tie rule of "Most read" and what the 7 days are were `<TO SUPPLY>`; the mocks draw "Most read"
  hidden when it is empty or fails, while the design said it loads with the stories.
- The section's value in the address is the feed slug of ADR 0071 (`faith-body`), while the API
  names the section `faith-and-body` (ADR 0097).
- The join card's "2,400+ members across the GTA" has no data behind it (ADR 0037).
- The newsletter box (journey 27) and the footer's Newsletter, RSS and Send feedback links
  (journeys 26, 27 and 30) are later journeys'.

## Decision

- **Who leads.** Latest's lead is the readable story placed as the Lead (the newest such, should
  two be readable at once), else the newest readable story. The headlines are the stories placed in
  Top headlines, newest first, filled with the newest other stories up to four, and shown newest
  first. The river is every other readable story, newest first. With nothing placed, this is
  exactly `L2-001` AC2's "newest leads, next four"; with placements, it honours `L2-069` AC6.
  "Readable" is `PublishedStories.At` (ADR 0069, ADR 0105): a Scheduled story whose time has come
  counts at its scheduled time.
- **The front page read.** `GET /api/public/stories?section=&skip=` (anonymous, `public-reads`)
  answers `FrontPageDto`: `lead` (or `null`), `headlines`, `latest` and `more`. Each story is a
  `StorySummaryDto`: `id`, `slug`, `section`, `headline`, `summary` (`null` when empty), `author`,
  `publishedAt` and `image` (key and crop, as Keep reading's). With a `section` (the API's name,
  `faith-and-body`) the answer has no lead and no headlines, only that section's river. The river
  comes 12 at a time from `skip`; `more` says whether older stories follow. `skip` runs from 0 to
  48, so the page holds at most 60 river stories; anything else, or an unknown section, is 400
  `validation_failed` with `section_invalid` or `skip_invalid`.
- **More stories.** The page adds each page to the river and shows "More stories" while `more`
  holds, "Loading more stories…" while one loads, and "More stories didn't load. The ones above
  are still here." with Try again when one fails, keeping the rows shown. At 60 with more to come
  it reads "That's the latest 60 stories. Choose a section above to see older ones."; in a section
  the second sentence is left out, since no section narrower than it exists. `riverEndOf` in the
  domain library holds the rule.
- **Most read.** `GET /api/public/most-read-stories` (anonymous, `public-reads`) answers the five
  readable stories with the most reads in their daily tallies (ADR 0105) from the Toronto day six
  days ago to today, a tie going to the newer story, then the higher id. A story with no reads in
  that window is not ranked. It is its own request and address, outside `api/public/stories/…`, so
  no story link can hide it. The page hides "Most read" while it loads, when it is empty and when it
  fails; nothing else changes (mocks `most-read-empty`, `most-read-failed`).
- **Sections in the address.** `/?section=<slug>` uses ADR 0071's feed slugs: `events`,
  `training`, `nutrition`, `faith-body`, `community`, `pros`. `newsSectionOf` maps them to the API
  names and maps anything else, or none, to Latest, which sends no `section`. A section is chosen
  through the router, so the page stays and reads the new query.
- **The rail's events.** `GET /api/public/events/upcoming` allows `take` up to 4 and each event
  gains `area`; the row reads "Sat 6:45 AM · Waterfront".
- **Components.** The library gains `cf-masthead` (block `masthead`, `section-nav`), and under the
  design system's `story` page `cf-story-lead`, `cf-headline-list`, `cf-river` and
  `cf-ranked-list`, and under `newsletter-box` `cf-join-card`. The masthead's bar keeps its own
  element names (`masthead__actions`, `masthead__signin`) rather than the mock's `site-header__*`,
  which belong to the top bar's block. The top stories, news grid, rail, ruled titles and verse are
  page composites in the page stylesheet. The story page keeps the top bar's `site` form (ADR 0105)
  for now; it may move to `cf-masthead` without sections later.
- **Professionals leave the page.** The "Meet our professionals" section, its directive, the public
  professionals service and contract, `GET /api/public/services/featured` and its query are
  removed; ADR 0057 is superseded.
- **Left out.** The join card's member count stays out until a requirement states it. The
  newsletter box, the footer's Newsletter, RSS and Send feedback links and the feed links in the
  document head are journeys 26, 27 and 30's; the footer keeps the Privacy Policy and Terms of
  Service links.

## Consequences

- An editor's placement and a visitor's "newest first" agree: nothing placed reads as the
  requirement says, and a Lead or Top story stays up until a newer one is placed or published.
- The river cannot grow past 60 rows in a visit, so a long session's DOM and memory stay bounded;
  older stories are a section's.
- Three requests serve the page (stories, events, most read) and fail apart; Try again repeats only
  the one that failed.
