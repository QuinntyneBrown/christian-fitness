# 0086. Listing suggestions: the record, the request, the field codes and the screen's stand-ins

## Status

Accepted, 25 November 2026 (journey 17, issue #167). Builds ADR 0077 and ADR 0082.

## Context

`L2-062` asks for a Suggest a listing screen at `/directory/suggest` and a stored suggestion that
staff review later (`L2-073`, journey 18). ADR 0077 fixed the required fields, the limits and the
rolling 24-hour window. The detailed design (`directory/suggest-listing`) still left open the
request's names, the codes of each refused field, how a website without a scheme is read, the
copy for the refusals the mocks do not draw, and the "How we vet every listing" link, whose story
cannot exist before the publishing journeys (22 to 24). Its requirements table also still said
"a name over 100 characters" and allowed `http`, which `L2-062` AC7 and ADR 0077 replaced with 120
and `https` only.

## Decision

- **Record.** `ListingSuggestion` (`ChristianFitness.Domain/Directory/`, table
  `ListingSuggestions`) holds `Id` (version 7 from the submission instant), `SuggestedById` (the
  member), `Relation` (`SuggestionRelation`: `Myself`, `SomeoneIKnow`, `SomewhereIveBeen`), `Kind`
  (`ListingKind`), `Name`, `Where`, `Website` (normalized, or none), `ChurchConnection`, `Reason`,
  `ContactEmail`, `MayTellWhoSuggested`, `SubmittedAt` and `Status` (`SuggestionStatus`:
  `Waiting`, `Approved`, `Declined`; created `Waiting`). Every text is trimmed and a blank optional
  text is stored as none. A self-submission stores no contact email and `MayTellWhoSuggested`
  false. Journey 18 adds `DecidedAt`, `DecidedById`, `DeclineReason`, `ListingId` and the four
  checks with the review, so no column waits unused. An index on `(SuggestedById, SubmittedAt)`
  serves the daily count.
- **Request.** `POST /api/directory/suggestions` (member session, fallback policy) takes
  `{ relation, kind, name, where, website, churchConnection, reason, email, mayTellWhoSuggested }`.
  `relation` is `myself`, `someone-i-know` or `somewhere-ive-been`; `kind` is the ADR 0082 slug.
  For `myself` the API ignores `email` and `mayTellWhoSuggested`; the screen also leaves them out.
  It answers 201 with `{ id, name }` only.
- **Refusals.** A failed field is 400 `validation_failed` with one `fieldCodes` entry per field (the
  top-level code stays `validation_failed`, not `field_too_long`, so each field's own code is the
  one to read):

  | Field              | Code                         | When                                       |
  | ------------------ | ---------------------------- | ------------------------------------------ |
  | `relation`         | `relation_invalid`           | not one of the three                       |
  | `kind`             | `kind_invalid`               | not one of the six slugs (ADR 0082's code) |
  | `name`             | `name_required`              | blank                                      |
  | `name`             | `name_too_long`              | over 120 characters, trimmed               |
  | `where`            | `where_required`             | blank                                      |
  | `where`            | `where_too_long`             | over 120                                   |
  | `website`          | `website_too_long`           | over 200, once read                        |
  | `website`          | `website_invalid`            | not an `https` web address once read       |
  | `churchConnection` | `church_connection_too_long` | over 200                                   |
  | `reason`           | `reason_too_long`            | over 1,000                                 |
  | `email`            | `email_too_long`             | over 254                                   |
  | `email`            | `email_invalid`              | not an email address (ADR 0008's pattern)  |

  The handler then refuses a suspended member 403 `account_suspended` and, when the member already
  sent 5 suggestions in the 24 hours before now (`AttemptWindow(5, 1 day)`, counted from the stored
  suggestions, so it holds across instances), 429 `too_many_attempts`.

- **Website.** Blank is none. A value with no `://` is read with `https://` in front (the mock's
  `instagram.com/eastsideladieslift`). The result must be an absolute `https` address with a host
  that has a dot and no user name or password, and at most 200 characters; it is stored as read.
  `http://` is refused, as ADR 0077 shows no non-`https` website.
- **Client checks.** The screen checks only what `L2-062` AC4 names before sending: a blank name
  ("Add a name so we know who to look up.") or place ("Add where they meet or work."). Focus moves
  to the first marked field. The limits are the API's alone, so no rule is computed in both stacks;
  a 400 marks each field its `fieldCodes` name with that code's sentence (copy below), and moves
  focus to the first.
- **Copy the mocks do not draw.** Field sentences: `name_too_long` "Use 120 characters or fewer.",
  `where_too_long` "Use 120 characters or fewer.", `website_invalid` "Enter a web address that
  starts with https://, or leave it empty.", `website_too_long` "Use 200 characters or fewer.",
  `church_connection_too_long` "Use 200 characters or fewer.", `reason_too_long` "Keep it to 1,000
  characters.", `email_invalid` "Enter an email address like name@example.com", `email_too_long`
  "Use 254 characters or fewer." A 400 shows the `error` mock's alert with "Check the highlighted
  fields"; 429 "You've sent 5 suggestions today" and "You can suggest more tomorrow. Everything you
  typed is still here."; 403 `account_suspended` "Your account is suspended" and "Suggestions can't
  be sent while your account is suspended."; any other answer or none is the `error` mock. These
  stand in for the missing `refused` states until a mock draws them.
- **"How we vet every listing".** The design shows it only when the story
  `how-we-vet-every-listing` is published. No story can exist before journeys 22 to 24, so the
  screen renders the `vetting-unavailable` state; journey 24 adds the published check and the
  seed.
- **Components.** The screen builds the design system's `choice-card` (cards and choice chips),
  `steps` (with its `done` block) and the form layout's `form-page` in the components library. The
  `suggestion` component is the admin console's review card; it is built with journey 18, the
  first screen that uses it.

## Consequences

- The detailed design's requirements table and open questions now state 120, `https` only and the
  names above; `L2-062` is unchanged.
- Journey 18 reads `ListingSuggestions` by `Status` and adds the decision columns.
- No new setting: the limit is fixed by `L2-062` AC8.
