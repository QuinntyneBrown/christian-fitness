# 0000. First Google sign-in slice

## Status

Accepted, 24 November 2026 (resolves issue 82, step 19 of 37).

## Context

L2-049 names only `too_many_attempts`. The first Google sign-in slice also needs the refusal codes, the
life of the `__Host-cf-google` cookie, a rule for Google's account chooser, a decision on the Google
photo (AC9 forbids loading it from Google), the mapping of a Workspace account to a staff `Member`, and
the wording for a session ended by the 12-hour maximum.

## Decision

- **Refusal codes.** `google_email_unverified` (no Google identity, or an unverified email);
  `no_account` (no member account on this Google account; the screen offers Join);
  `account_suspended` and `account_deleting` for an account in those states (a deleting account is
  offered Restore); `google_unavailable` (Google not configured, or not reachable); and the existing
  `too_many_attempts` (HTTP 429). Staff keep `wrong_domain` and `not_staff` (L2-018).
- **`__Host-cf-google`.** Encrypted with Data Protection, `HttpOnly`, `Secure`, `SameSite=Lax`, and it
  lasts 10 minutes, just long enough to finish joining. "Change" deletes it at once.
- **Account chooser.** `prompt=select_account` is sent only for "Use another account" and "Try another
  Google account". Every other attempt lets Google choose as it normally does.
- **Google photo.** The server copies the photo into `IImageStore` once, at join, if the member keeps
  it. The browser never loads it from Google, so L2-049 AC9 holds. "We'll bring over your name and
  photo" stays.
- **Staff mapping.** A staff `Member` is matched by Google subject. On a staff account's first Google
  sign-in, a verified email in the team's domain is matched to the pre-created staff `Member` and the
  subject is bound; after that only the subject counts. `cf seed` creates the first Admin from
  `Seed:AdminEmail`. Later staff are created by an Admin (out of scope here).
- **Session-expired copy.** A session ended by the 12-hour maximum says "You were signed out after 12
  hours. Sign in again to continue." The mock that said "after 30 minutes without
  activity" now shows this copy.

## Consequences

- L2-049 gains AC11 to AC15, and the sign-in designs lose their `<TO SUPPLY>` questions on these points.
- The Google photo needs a server-side fetch of Google's picture address at join; it is not kept
  otherwise and no Google token or image address reaches the browser.
- A staff account with no stored subject can be claimed by a verified email of the team's domain, so the
  domain check stays on the server (L2-018 AC3).
