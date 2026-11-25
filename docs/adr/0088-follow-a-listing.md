# 0088. Follow a listing: idempotent PUT and DELETE, the caller's state on reads, and an hourly change log

## Status

Accepted, 25 November 2026 (journey 8, issue 158). Builds on ADR 0077, ADR 0082 and ADR 0087.

## Context

`L2-056` asks for a Follow toggle in the directory rows and the profile head, changed at once and
put back with a toast when the request fails, idempotent both ways, refused for a suspended member
(`account_suspended`) and past 60 changes an hour (`too_many_attempts`, 429). The design
(`directory/follow-listing`) names the endpoints and the `ListingFollow` record but leaves open how
the screens learn whether the member already follows a listing, how "60 an hour" is counted when an
unfollow deletes its row, what an unfollow by a suspended member does, and what the in-flight state
looks like: the design system said "Busy: none" before `L2-056` AC8 asked for `aria-disabled`.

## Decision

- **Endpoints.** `PUT /api/directory/{id}/follow` follows and `DELETE /api/directory/{id}/follow`
  stops following; both need a session (the fallback policy) and answer `ListingFollowDto`
  `{ following, followers }`, the caller's state and the listing's count after the change. Repeating
  either succeeds and writes no follow (`L2-056` AC4). A listing that is not `Published`, an unknown
  id included, is 404 `listing_not_found` for both.
- **Record.** `ListingFollow` (`MemberId`, `ListingId`, `FollowedAt`) is keyed by the pair, both
  foreign keys cascading. A second insert of the same pair racing the first is a unique-key
  conflict the follow handler answers as success.
- **The caller's state on reads.** `DirectoryListingRowDto` and `ListingProfileDto` gain
  `following`: whether the signed-in caller follows the listing, `false` for an anonymous caller
  (the reads stay `[AllowAnonymous]`, ADR 0082). `ICurrentMember` gains `SignedInId`, the member's id
  or none, for reads that serve both. The profile's `followers` is now the real count. No endpoint
  names who follows a listing; staff have none either until one is specified (`L2-056` AC6).
- **Suspension.** A suspended member's follow is refused 403 `account_suspended`. Their unfollow is
  allowed, as the design proposes: stopping hearing from a listing harms no one.
- **Hourly limit.** Every follow and unfollow that passes the suspension check is logged in
  `ListingFollowChanges` (`MemberId`, `ChangedAt`), repeats included, since each is a request sent.
  When 60 lie within the last rolling hour (`AttemptWindow(60, 1 hour)`), the next is refused 429
  `too_many_attempts` and is not logged. Each accepted change deletes the member's entries older
  than an hour, so the log holds at most 60 rows a member and needs no scheduler (ADR 0083's rule).
- **The client.** `DirectoryApi` gains `follow(id)` and `unfollow(id)`. A `ListingFollowStore`
  (domain library, contract `ListingFollowsApi`, token `LISTING_FOLLOWS`) holds the state, count and
  in-flight flag of each listing a screen shows, flips them at the press, takes the server's answer
  on success and on any failure puts them back and shows the danger toast "We couldn't follow
  <name>" or "We couldn't unfollow <name>" with "Try again in a moment.", whatever the code: the
  codes stay for the screen to branch on later. It is provided on the Directory and listing profile
  screens with a `ToastStore`, so its requests and timers end with the visit.
- **Busy.** While its request is in flight the button keeps its new state, carries
  `aria-disabled="true"` and ignores presses (`L2-056` AC8). It looks as the new state does, with a
  `progress` cursor: the press already shows its result, so no mock state is drawn for it.
- **Touch.** The row button stays 108 × 36 px as drawn; under a coarse pointer its target extends to
  44 × 44 px (`--target-comfortable`), as small buttons and chips do (`L2-054` AC9).
- **Not yet built.** Ranking followed listings' new events in Home's suggestions (`L2-056` AC7) is
  journey 34's.

## Consequences

- `L2-056` AC1 to AC6, AC8 and AC9 are met; AC7 waits for journey 34.
- One migration adds `ListingFollows` and `ListingFollowChanges`.
- `IAppDbContext` gains two sets, so its hand-written test doubles change.
