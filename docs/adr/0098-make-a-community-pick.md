# 0098. Community Pick: a Moderator's area, picks recorded and audited, the link origin from the API, graphics drawn by a lazy canvas module, and `/e/<id>` through Join

## Status

Accepted, 25 November 2026 (journey 32, issue #182). Builds ADR 0020, ADR 0023, ADR 0064,
ADR 0071, ADR 0091 and ADR 0092; amends the detailed design `admin-events/make-community-pick`,
the design-system pages `pick-art`, `pick-list` and `textarea`, and the Community Pick mocks.

## Context

`L2-072` lets staff choose a published upcoming event, write a one-line note and get branded
graphics and captions for Instagram, Facebook, WhatsApp and Slack, and `/e/<id>` links bring
people to the event. The requirement, the design, the design system and the mocks disagreed on
these points, or left them open:

- The design makes `StaffArea.CommunityPick` Admin-only, so a Moderator is refused 403
  `forbidden_role`; `L2-072` AC11, the design's own navigation line and the `moderator` mock say a
  Moderator uses the screen as an Admin does.
- The design names a new Admin web app setting `publicSiteOrigin`. The admin app is a static
  build with no runtime settings, and the API already holds the member app's public address
  (`MemberApp__BaseUrl`, which every emailed link starts with).
- The design-system page `pick-art` says Copy confirms with a toast ("Caption copied"); `L2-072`
  AC7 says the button reads "Copied" for about 2 seconds with a `status` message.
- The mocks name files `community-pick-sunrise-5k-…` for "Easter Sunrise 5K", while the design
  says the event part is the title, lower-cased and hyphenated.
- The mocks show an event's area as the neighbourhood alone ("Waterfront"), while events store
  "Waterfront, Toronto".
- The design uses the existing `Textarea` with `maxlength="70"`; the library's textarea never
  sets `maxlength` (its counter lets people go over and says so), and its counter reads
  "n characters left." rather than the mock's "n of 70 characters".
- The recorded pick has no rule for an unknown, unpublished or past event, nor a code for a note
  over 70 characters.

## Decision

- **Moderators use it.** `api/admin/community-pick` is `StaffArea.CommunityPick`, which
  `StaffAccess` opens to Admins and Moderators. Both navigations list "Community Pick" (under
  Gather in an Admin's). "Make it a pick" lives in Events, which a Moderator does not open.
- **Reads.** `GET api/admin/community-pick/events` answers `{ siteOrigin, events }`: `siteOrigin`
  is `MemberApp:BaseUrl` without a trailing slash, and `events` the published events whose start is
  after now, soonest first (ties by id), at most 100, each with `id`, `title`, `category`,
  `startsAt`, `place`, `area`, `priceCents`, `spotsLeft` (capacity less going, never below 0),
  `imageKey` and `lastPickedAt` (the latest pick, or `null`). A session of a series is an event and
  is listed like any other. No new setting is added; `docs/operations/settings.md` drops
  `publicSiteOrigin` and names Community Pick under `MemberApp__BaseUrl`.
- **Recording.** `POST api/admin/community-pick/picks` with `{ eventId, note }` stores a
  `CommunityPick` (event, trimmed note, who, when) and answers 201 `{ eventId, pickedAt }`; the page
  shows "Last picked" from it in place. A note over 70 characters is 400 `field_too_long` with
  `fieldCodes: { note: "note_too_long" }`; an empty note is allowed (the graphics then carry
  none). An unknown event is 404 `event_not_found`; one not published, or whose start has passed,
  is 409 `event_not_published`. It is audited `community_pick.recorded` against the pick. The note
  is never logged nor put in telemetry. The page records the pick after the graphics are made, and
  a failed record changes nothing on screen: the downloads stay usable (design's decision).
- **Graphics.** `pick-art-renderer.ts`, in the page's folder, is imported on the first Create
  only. It fetches the photo with `fetch` (not `HttpClient`, so a failed image is the screen's
  failure, not the server-error screen) and an `AbortController` the page aborts on destroy, waits
  for the self-hosted Barlow and Barlow Condensed faces with `document.fonts.load`, reads the brand
  colours from the design tokens on `:root` at draw time, and draws each size on its own canvas.
  For contrast it samples the pixels under the text and adds a brand overlay at the smallest
  opacity, in steps of 0.05, that brings every sample to 4.5:1 against both text colours
  (`pickShadeFor`, blended per sRGB channel as the canvas blends). An event with no image gets the
  brand pattern. Each canvas is exported with `toBlob('image/png')` to an object URL, and the page
  revokes those URLs when new ones replace them and when it is destroyed.
- **Captions and files.** `pickCaptionOf` writes each platform's caption from the mocks' text, the
  link `${siteOrigin}/e/${id}` (Instagram's text form drops the scheme). `pickFileNameOf` gives
  `community-pick-<title in lower case, hyphenated>-<platform>[-post|-story].png`; the mocks are
  corrected to `community-pick-easter-sunrise-5k-…`. Copy shows "Copied" for 2 seconds and a
  visually hidden `role="status"` says "Caption copied"; the `pick-art` page is corrected.
- **Area.** The list and the graphics show the area up to its first comma ("Waterfront" for
  "Waterfront, Toronto"), as the mocks draw it (`pickAreaOf`); captions show the place.
- **The note field.** `cf-textarea` gains a `limit` input that sets the native `maxlength`, for a
  field that must never hold more (the textarea page documents it); the page passes the hint
  "One line. It goes on the graphics and in every caption. <n> of 70 characters." from
  `pickNoteHintOf` and no counter.
- **Short link.** `/e/:id` is a member route outside the shell with `eventLinkGuard`: with a
  session it redirects to `/events/<id>`; without one (401) to `/join?returnUrl=/events/<id>`.
  Join's "Sign in" link keeps the same `returnUrl`, and Join and Sign in already return to it
  (ADR 0092). An unpublished event is the event page's existing not-found view.

## Consequences

- A Moderator can promote events but still cannot create or edit them.
- Changing `MemberApp__BaseUrl` changes every caption's link as well as every email's; there is
  one public address to keep right.
- The canvas code and its fonts load only on Create; the admin initial bundle grows only by the
  route and the navigation item.
- Picks are kept forever, like audit entries; a pick holds no personal data beyond who made it.
