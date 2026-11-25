# 0087. Reviewing listing suggestions: the system account, the console's directory area, checks, decisions, Listed and its editor

## Status

Accepted, 25 November 2026 (journey 18, issue #168). Builds ADR 0065, ADR 0077, ADR 0078, ADR 0079
and ADR 0086; amends the detailed design `admin-directory/review-listing-suggestions`.

## Context

`L2-073`, `L2-062` AC9 and `L2-014` AC8 ask staff to check, approve and decline the suggestions of
journey 17, and members to hear back from the Christian Fitness account of ADR 0065, which nothing
had built. The design left the address of Listed, the codes, the decline dialog's mock, the endpoint
of the navigation's counts and the staff editor's endpoint open, and put that editor under the
Admin-only `api/admin/listings`, which ADR 0064 and `L2-019` AC1 open to Moderators as well and
which already serves Services listings. No follow, admin hub, scheduler or feedback screen exists
yet (journeys 8, 9, 30 and ADR 0069).

## Decision

- **The system account (ADR 0065).** `Member.IsSystem` marks it. `SystemMembers.ChristianFitnessId`
  is `0193a9c0-0000-7000-8000-00000000cf00`; its name is "Christian Fitness", its email the
  unroutable `system@christian.fitness.invalid`, and its password hash empty. `cf seed` adds it
  when missing (`SystemAccountSeed`, always run). The shared credential check treats it as an
  unknown email (same fixed-hash timing, same failure record, `invalid_credentials`), and a reset
  request for its email is answered as for an unknown one, with no mail. The admin Members list and
  its total leave it out; its public profile is 404 `not_found` (the code that route already uses).
  Joining the conversation with it succeeds and answers `system: true`; a send to it is refused
  with the hub answer `system_account`. The member's chat shows "Official account · Doesn't read
  replies" under the name and, in place of the composer, "This account doesn't read replies. To
  reach the team, use Send feedback." with Send feedback linking to `/feedback`, the address
  journey 30 builds. A refused send shows "That message wasn't sent. This account doesn't take
  messages." and the note.
- **Sending as it.** `SystemMessages.Add(recipient, text)` adds an ordinary `DirectMessage` from the
  account in the caller's unit of work and, after the save, pushes it to the recipient's
  connections. A suspended recipient is not sent one. Texts are ADR 0065's.
- **The area.** Every endpoint is under `api/admin/directory`, `StaffArea.Directory`, which an
  Admin and a Moderator open (ADR 0064):

  | Request                                            | Answer                                                    |
  | -------------------------------------------------- | --------------------------------------------------------- |
  | `GET suggestions?after={id}`                       | `{ waiting, listed, suggestions, next }`: 50 oldest first |
  | `GET suggestions/{id}`                             | the panel's fields and the four checks                    |
  | `PUT suggestions/{id}/checks/{check}` `{ passed }` | the four checks                                           |
  | `POST suggestions/{id}/approve`                    | `{ status, listingId, claim }`                            |
  | `POST suggestions/{id}/decline` `{ reason? }`      | `{ status, listingId: null, claim: null }`                |
  | `GET listings?after={id}`                          | `{ total, listings, next }`: 50 published, in name order  |
  | `PUT listings/{id}`                                | the listing as saved                                      |
  | `POST photos` (multipart `file`)                   | 201 `{ photoKey }`                                        |

  The staff editor is `PUT api/admin/directory/listings/{id}`, not the design's
  `PUT api/admin/listings/{id}`. `GET api/directory/photos/{key}` serves a listing's photo to
  anyone, as event images are (ADR 0025), from the same image store. Check slugs are
  `credentials`, `insurance`, `two-references` and `conversation`; kinds are ADR 0082's slugs.

- **Codes.** 404 `suggestion_not_found`; 409 `suggestion_decided` for a check, approval or decline
  of a decided suggestion; 409 `checks_incomplete` for an approval with fewer than four checks
  passed; 404 `not_found` for an unknown listing; 400 `validation_failed` with `fieldCodes`
  (`reason_too_long` over 500; for the editor `name_required`, `name_too_long` over 120,
  `kind_invalid`, `area_required`, `area_too_long` over 120, `tagline_too_long` over 100,
  `about_too_long` over 1,000, `website_invalid`, `website_too_long` over 200, read as ADR 0086
  reads a suggestion's website, and `photo_invalid` for a key the store does not hold). A name may
  be 120 characters because a suggestion's may (ADR 0077); `L2-079` AC3's 100 is the owner's
  editor and journey 20 reconciles the two.
- **Checks.** `SuggestionCheck(SuggestionId, Check, Passed, ChangedById, ChangedAt)`, one row per
  check once first set; a check with no row has not passed. Setting a check to its current value
  saves and audits nothing. Each change is audited `suggestion.check_set`.
- **Approve.** In one unit of work the suggestion becomes Approved with who and when, a draft
  `DirectoryListing` is made from its kind, name, area and website (tagline and about empty) and
  linked both ways, the sender gets "Thanks for suggesting {Listing}. It's now in the directory.",
  and then the claim follows `L2-078` AC1 to AC3: with a contact email a `ListingClaim` (only the
  SHA-256 hash of a 32-byte token, 14 days) and an email with `/claim/{token}`; a self-submission
  with no email the same claim, sent to the sender as a direct message from the account with
  ADR 0065's text; otherwise the listing is published at once with no owner and no claim. `claim`
  answers `email`, `message` or `staff-managed`. The claim screen is journey 19. Audited
  `suggestion.approved`.
- **Decline.** A dialog (mock `decline-suggestion`) asks for an optional reason of at most 500
  characters, kept as `DeclineReason` for staff; the sender gets "Thanks for suggesting {Listing}.
  We won't be adding it this time."; the suggested party is not contacted. Audited
  `suggestion.declined`.
- **Retention (ADR 0077, ADR 0078).** Suggestions lists the waiting ones and those decided in the
  last 90 days, oldest submitted first, 50 at a time with "Load more" (`after` is the last id
  shown). With no scheduler (ADR 0069), each approval or decline deletes the suggestions decided
  more than 12 months before, with their checks, as ADR 0083 sweeps notifications on write.
- **Listed.** Each published listing with its mark, name, Verified mark, kind, area and followers.
  No follow exists until journey 8, so followers answer 0. Edit opens
  `DirectoryListingEditorDialog` with name, kind, area, tagline, about, website and photo, and no
  Verified control; "{name} updated" and "The directory shows the changes now." confirm it. Audited
  `listing.updated`; a photo upload is audited `listing_photo.uploaded`.
- **Addresses.** Suggestions is `/listings`, Listed `/listings?tab=listed`, and the chosen
  suggestion `?selected={id}`. Listings joins the console's navigation before Services and is
  opened by both roles.
- **Counts (ADR 0079).** `GET api/admin/counts` (the console area) answers `{ suggestions }` to
  both roles for now; `stories`, `applications`, `members` and `feedback` join the answer with the
  journeys that give their links a count. The admin shell reads it on entry and again when a screen
  asks through `ADMIN_COUNTS` after a decision; the admin hub's `countsChanged` comes with the
  journey that builds that hub. A failed read shows no count and no error.
- **Dashboard (`L2-020` AC11).** The waiting-work answer gains `suggestions` (`total` and the oldest
  three names), for both roles; "Needs attention" shows one line, "{n} listings suggested by
  members" (one: "1 listing suggested by a member") with the names and Check opening `/listings`,
  ahead of the applications, and the heading counts each suggestion.
- **Components.** The screen builds the design system's `suggestion` (with `check-row` and
  `listed-cell`) and `pick-list` (pick cards) in the components library. `review-card`, named in
  the issue, is the Stories call-out (journey 22) and is not used here.

## Consequences

- The design's open questions are settled here and its README follows; the decline dialog has a
  mock of its own.
- Journeys 19 and 20 build on `ListingClaim`, the editor and its endpoint.
- No new deployed setting: the claim link starts with the existing `MemberApp__BaseUrl`.
