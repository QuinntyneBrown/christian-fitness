# 0097. Write and publish stories

## Status

Accepted, 25 November 2026 (journey 22, issue 172). Builds on ADR 0020, ADR 0023, ADR 0025,
ADR 0047, ADR 0071 and ADR 0094.

## Context

Journey 22 turns the minimal `Story` of ADR 0094 into the console's Stories list (`L2-068`) and
the story editor with review, Preview, publication, Update and Unpublish (`L2-069`, but not AC4:
scheduling is journey 23). The requirement, the two designs (`publishing/manage-stories`,
`publishing/write-review-publish-story`) and the mocks left these open:

- How a status, section, placement and pointer are named in the address and the API, what a row's
  "when" is, and what "reads" is before the story page (journey 24) counts any.
- What an autosave carries, and how a save over a version not seen is told from one that lost a
  race in the database.
- The design's lengths were `<TO SUPPLY>`; the slug rules were named but not the next step link's.
- Preview must "reuse the story page's presentation components", but no story page exists yet;
  the preview mock draws the member site's masthead, Copy link, a correction line, Keep reading and
  the Weekly box, none of which the admin app has.
- The design says the server "serves the crop" with no image library.

## Decision

- **Names.** The API and the address name a status `draft`, `review`, `scheduled` or
  `published`; a section `events`, `training`, `nutrition`, `faith-and-body`, `community` or
  `pros`; a placement `lead`, `top` or `latest`; and a pointer `event` or `listing`. Stories'
  address carries `?status=` and `?page=`; an unknown status reads as All and a bad page as the
  first.
- **List.** `GET /api/admin/stories?status=&page=` answers every tab's count, at most three stories
  in review (longest waiting first) and one page of 50 rows, newest activity first. A row's `when`
  is the Draft's last edit, the submission, the scheduled time or the publication. `reads` is
  `null` for a story never published and a number once it has been, kept after Unpublish; nothing
  counts a read until the story page exists (journey 24), so it is 0 until then. Admin counts gain
  `storiesInReview` (Admins only), shown beside Stories in the navigation.
- **Lengths.** Headline 160, summary 300, text 50,000, next step text 80, next step link 500 and
  link 80 characters, refused with `headline_too_long`, `summary_too_long`, `text_too_long`,
  `next_step_too_long`, `next_step_link_invalid` and `slug_invalid`. Every field may be empty while
  a story is written; what publishing needs is checked when it is published.
- **Links.** A next step link is a page of the member app (a path starting with one `/`) or an
  `https` address. A story's link (`slug`) holds lower-case letters, digits and single hyphens.
- **Saves.** `POST /api/admin/stories` keeps a new Draft (201) on the editor's first save, and
  `PUT /api/admin/stories/{id}` saves a Draft or a story In review with the `version` it was read
  at; any other version is 409 `story_changed`, as is a concurrency failure in the database. A save
  of a Scheduled or Published story is 409 `status_conflict`. Saves are not audited (`L2-069`
  AC14). The editor saves 2 seconds after the last edit; on `story_changed` it stops saving and
  offers "Load the newer version" or "Keep my version" (which reads the newer version and saves
  what was typed over it).
- **One renderer.** The story text is stored as written. The domain library's `storyBlocks` is the
  one renderer of the Markdown subset: it answers blocks of text runs (paragraph, quote, `##` and
  `###` heading, bulleted or numbered list; emphasis, strong and `https` links), never HTML, and
  the components library's `story` draws the runs as text. Raw HTML therefore shows as the words
  typed; a link to anything but an `https` address keeps its words and loses its address. The
  block types live in the `api` library so the components library can draw them without importing
  the domain library. The member story page (journey 24) uses the same function and component.
- **Preview.** `GET /api/admin/stories/{id}/preview` answers the story as readers will see it,
  whatever its status, with `X-Robots-Tag: noindex`. Its `next` card is present only with "Next
  step" words and a published event or listing to point to (`L2-061` AC4); its `link` is the
  editor's link or else `/events/<id>` or `/directory/<id>`. The admin app's
  `/stories/<id>/preview` sits outside the staff shell, behind the staff guard, so a Moderator sees
  Admins only. It draws the warning banner ("Preview · In review." and who can see it, with Close
  preview back to the editor) and the library's `story`: section, headline, summary, byline line,
  body and the next step card. The byline line reads "2 hours ago · 6 min read" (200 words a
  minute), or "Not published yet · …" before publication. The card is drawn without a link, as the
  reader's address is the member app's, which the admin app does not know. The member site's
  masthead, Copy link, the correction line, Keep reading and the Weekly box are left out: they
  belong to the public story page (journey 24) and mean nothing in a preview. The editor's Preview
  is a link opening a new tab; for a story not yet kept or with no headline it is a disabled
  button. It stays available during an autosave, which changes nothing Preview reads that the
  next read would not show.

## Consequences

- Journey 24 renders the public story page with `storyBlocks` and the library's `story`, adding
  Copy link, the correction line and Keep reading to it.
- Reads stay 0 until journey 24 counts them.
- Journey 23 adds scheduling: the When choice, Schedule, Unschedule and the publishing clock.
