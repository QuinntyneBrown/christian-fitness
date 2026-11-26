# 0109. Send feedback

## Status

Accepted, 26 November 2026 (journey 30, issue 180). Builds on ADR 0025, ADR 0071, ADR 0086 and
ADR 0105.

## Context

Journey 30 builds the member side of feedback (`L2-063`, `L2-008` AC5): the Send feedback screen at
`/feedback`, its entry points in the member footer and on a story, and the API that stores a note.
The design (`feedback/send-feedback`) leaves some points open or disagrees with the requirement or
the mock:

- `L2-063` AC8 asks for 400 `validation_failed` with `fieldCodes.text` = `field_too_long`, but
  `ProblemCodes` promotes any `field_too_long` failure to the top-level code (`L2-003` AC6).
- The mock's "About this page" names the event ("Event series › Couch to 5K Run Club"); the design
  says a page template gives only a page-type label, and says the title is resolved separately
  without saying by whom.
- The design's open question: `L2-063` AC12 accepts feedback from a suspended member, but
  `L2-004` AC4 refuses a suspended member's sign-in and `L2-029` AC2 ends their sessions.
- The `too_many_attempts` sentence is `<TO SUPPLY>`; the screenshot directory is a new setting;
  the staff side (`L2-074`, reply delivery in `L2-063` AC11) is journey 31.

## Decision

- **About.** The address carries what the note is about: `?about=page:<route template>` (such as
  `page:events/:id`) from the footer, `?about=story:<id>&kind=correction` from a story. The member
  footer's Send feedback link is built by the shell from the route the member is on and opens the
  screen in the app; the footer on a story gives `page:stories/:slug`. The query survives sign-in
  and reload (`L2-004` AC6).
- **One label, resolved by the server.** `GET /api/feedback/form?about=…` answers
  `{ email, about }`: the member's address for the email choice and, for an `about` it knows,
  `{ label }`, else `about: null` and the screen shows no chip. A page's label is its page type
  ("Event", "Event series", "Story", and so on, one row per member route the footer shows on); a
  story's is "Story › <headline>" for a Published story (as `PublishedStories.At` reads it). Only
  the server holds the table, so the screen and the stored note cannot disagree, and the screen
  never shows text that did not come from the server.
- **Sending.** `POST /api/feedback` is `multipart/form-data` with `kind` (`idea`, `problem`,
  `correction`, `thanks`), `text`, `about` (optional; removed from the screen means none),
  `mayEmail` (`true` or `false`) and an optional `screenshot` file. It answers 204. The server
  resolves `about` again and stores the route template or the story id with the label it gave
  (`PageTitle`); an `about` it does not know is refused with `fieldCodes.about` = `about_invalid`.
- **Refusals.** All are 400 `validation_failed` with one field code each: `kind_invalid`,
  `text_required` (blank or only spaces), `field_too_long` (over 2,000 characters after trimming,
  `L2-063` AC8), `about_invalid`, `image_too_large` (over 5 MB), `image_type_not_allowed` (content
  signature not JPEG, PNG or WebP, whatever the file's name or type says) and
  `screenshot_not_allowed` (a screenshot on a kind other than Something's off). A failure can say
  that its code names the field and not the body (`FieldCodes.FieldOnly` as its custom state):
  such a failure goes into `fieldCodes` but not into the top-level code, which is how
  `field_too_long` answers `validation_failed` here while Join's still answers `field_too_long`.
- **The limit.** Ten notes in a rolling hour per member (`FeedbackNote.SendWindow`); the eleventh
  is 429 `too_many_attempts`. The screen says "You've sent 10 notes this hour" and "You can send
  more in an hour. What you wrote is still here."
- **Suspended members.** The handler applies no suspension check, so a member whose session is
  still alive when they are suspended (the moment between suspension and the session's end, or a
  session another way keeps) can send; the inbox labels them (journey 31). A suspended member
  with no session cannot reach the screen, because sign-in refuses them: an appeal route that
  works without a session needs `L2-004` and `L2-029` to change, and is left to a later decision.
- **Device.** `IClientDevice` (beside `IClientAddress`) reads the request's `User-Agent` once into
  an OS family (iOS, iPadOS, Android, Windows, macOS, ChromeOS, Linux, else Other) and a browser
  family with its major version (Edge, Samsung Internet, Opera, Firefox, Chrome, Safari, else
  Other, with no version when none is read). One case table proves it. Nothing finer and never the
  raw header is stored.
- **Screenshots.** `IFeedbackScreenshotStore` keeps each screenshot under a new key (a GUID and the
  extension its signature gave, ADR 0025's `ImageKeys`) in its own private directory,
  `Feedback__ScreenshotDirectory` (else `feedback-screenshots` next to the application). No
  endpoint serves it yet: the inbox's staff endpoint (journey 31) will.
- **You said, we did.** Three entries written by Admins, bundled in the member app as static
  content (`YOU_SAID_WE_DID`); they become a story section later (`L2-063` AC3).
- **Library.** The chip is `cf-context-chip` and the list `cf-said`, both from the design system
  pages that document them (`steps` and `feedback-row`). The choice cards gain an optional icon
  per option, as the design system's card shows.
- **Deferred.** Staff reading notes, replying and reply delivery (`L2-063` AC10's staff side and
  AC11) are journey 31. A story's own footer passes the page type, not the story.

## Consequences

- The page-type table lives once, on the server; a new member route the footer shows on needs a
  row there or its footer link opens the form with no chip.
- A note never carries client text into a path or a log: the label is the server's, the key is
  the server's, and the text and screenshot stay out of telemetry by the allow-list of span tags.
- A suspended member without a session still cannot appeal through the app.
