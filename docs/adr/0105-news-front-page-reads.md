# 0105. News front page reads

## Status

Accepted, 26 November 2026 (journey 25). Builds on ADR 0069, ADR 0071, ADR 0072, ADR 0097 and
ADR 0104. Supersedes ADR 0037 where it says "at most 3" events. Supersedes ADR 0057 on the
landing page.

## Context

Journey 25 makes the landing page a news front page (`L2-001`). The design names
`GET /api/public/stories?section=` and a separate most-read read, and leaves these open or in
conflict:

- **Who leads.** `L2-001` AC2 says the newest story leads and the next four are headlines.
  `L2-069` AC6 says a story appears "where Publishing placed it" (Lead story, Top headlines, The
  latest), with only one Lead. The design reads only the first.
- **River length.** `L2-001` AC2 says "the rest follow"; the mocks load 12 at a time and stop at
  60 (`L2-037`), and no read said how a page continues.
- **Most read.** `L2-001` AC5 wants the five most-read stories of the last 7 days. Reads are
  counted by the story page (journey 24), which is not built, so no `StoryReadTally` exists.
- **Area.** `L2-001` AC5 shows each event's area. ADR 0076 decided a suggestion area chosen from a
  fixed list, but no slice has built it; events hold a free-text `Area` ("Waterfront, Toronto").
- **Section names.** The console names Faith & Body `faith-and-body` (ADR 0097); ADR 0071 gives
  readers the slug `faith-body`.

## Decision

- **One read.** `GET /api/public/stories?section=&cursor=` (`ListFrontPageStoriesQuery`) is
  `[AllowAnonymous]`, held to the `public-reads` limit (ADR 0072), and answers
  `{ lead, headlines, latest, nextCursor, mostRead }`. Each story is
  `{ id, slug, section, headline, summary, byline, publishedAt, imageKey }`: `section` is the
  ADR 0071 slug, `summary` is `null` when blank, `byline` is the byline's name and `imageKey` is
  served by `GET /api/stories/images/{key}`. Most read comes with this answer, not from a second
  endpoint, since the mocks load it with the stories.
- **Who may be read.** Published stories, and Scheduled ones whose time has come, at that time:
  the effective status of ADR 0069 and ADR 0104, as one conditional expression in the query. The
  order is that time, newest first, then id.
- **Placement, then date.** Placement is honoured first and date fills what staff left open, which
  satisfies both requirements:
  - The story placed Lead leads, whatever its age. Should two be placed Lead (a due Scheduled Lead
    the clock has not stored yet), the newer leads and the other is an ordinary story. With no
    Lead, the newest story leads (`L2-001` AC2).
  - Stories placed Top take the four headlines, the newest four of them. Where fewer than four
    are placed, the newest other stories fill the rest, so with nothing placed the page is exactly
    `L2-001` AC2. The four are shown newest first.
  - Everything else is the river, in date order: stories placed The latest, a Top story beyond
    the fourth, and a former Lead at its own publish time (`L2-069` AC6).
  - No story is answered twice on one front page.
- **A section.** `section=<slug>` answers only that section's stories as the river, with `lead`
  `null` and no headlines, whatever their placement (`L2-001` AC3). A section the API does not
  know is 400 `validation_failed` with `fieldCodes.section` = `section_invalid`; the page shows
  Latest instead of sending one.
- **Paging.** The river comes 12 at a time and 60 in all. `nextCursor` is `null` when no story
  remains or the reader has been given 60. A page asked with `cursor` answers the river alone:
  `lead` `null`, no headlines, no most read. The cursor is opaque URL-safe text holding the
  publish time and id of the page's last story, how many stories the reader has been given, and
  the ids of the lead and headlines of the first page. The river leaves those ids out on every
  page and continues strictly after the position, so a new Lead or a changed placement between
  pages neither repeats nor skips a story. A cursor the API did not write is 400
  `validation_failed` with `fieldCodes.cursor` = `cursor_invalid`. The same `section` is sent
  with the cursor.
- **Most read is empty for now.** `mostRead` is `[]` until journey 24 counts reads; the page hides
  the section when it is empty. The handler keeps the place where the five are read, on the first
  page of Latest only.
- **Four events, with their area.** `GetUpcomingEventsQuery.MaxTake` is 4, and `LandingEventDto`
  gains `area` beside `place`: the event's `Area` as staff wrote it, the same value the member's
  events list and Home answer ("Waterfront, Toronto", "Scarborough"). It is never empty, since an
  event cannot be saved without one. When the suggestion area of ADR 0076 is built, this field
  answers it instead.
- **Privacy.** The answers carry no member id or contact detail. A request is recorded as
  `GET api/public/stories` with its method and status; the section and cursor are never recorded.

- **The page, for now.** The member app's landing page draws the masthead, the top stories, the
  river and a rail with the join card, the events and Most read. It leaves out what would lead
  nowhere until its page exists: the newsletter box (Subscribe, journey 27) and the footer's
  Newsletter, RSS and Send feedback links (journeys 26, 29 and 30); the footer keeps Privacy and
  Terms. Each is added by the journey that builds its page. A story's title leads to
  `/stories/<slug>`, which is the not-found screen until journey 24. Most read is hidden while the
  stories load, not drawn as a skeleton, and whenever it is empty. The join card carries no member
  count (ADR 0037).
- **Professionals leave the landing page.** The "Meet our professionals" section, its client and
  its contract are removed from the member app, superseding ADR 0057 for the page. The API's
  `GET /api/public/services/featured` is left for a later clean-up; nothing calls it.

## Consequences

- No migration and no new setting.
- Each first page of Latest asks up to five small questions (lead, newest, Top, fill, river). The
  conditional publish time cannot use an index; the stories table is small. If it grows, a stored
  effective publish time is the fix.
- A reader paging while stories are published sees no story twice; stories that went out after the
  first page appear on the next load, as with every keyset cursor.
- A client can forge the cursor's count and read past 60; the bound protects the page's memory
  (`L2-037`), not a secret, and every story it reaches is public.
- The design's separate `GET /api/public/stories/most-read` and `ListMostReadStoriesQuery` are not
  built; journey 24 fills `mostRead` in this answer and settles the tie rule.
- ADR 0037's "at most 3" is now 4; the rest of ADR 0037 stands.
