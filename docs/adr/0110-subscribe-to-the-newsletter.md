# 0110. Subscribe to the newsletter

## Status

Accepted, 26 November 2026 (journey 27, issue 177). Builds on ADR 0010, ADR 0014, ADR 0069,
ADR 0070, ADR 0078 and ADR 0108.

## Context

Journey 27 lets anyone subscribe to The Abundant Weekly at `/subscribe` with double opt-in, and
leave with one click (`L2-057`, `L2-058`), and lists the feeds there (`L2-060` AC4, AC5). The
designs (`news/subscribe-to-newsletter`, `news/confirm-and-unsubscribe`, `news/publish-rss-feeds`)
leave these open or ahead of what exists:

- No issue has been sent yet: issues are built and sent in journey 29, so there is no latest issue
  to preview and no "last week's issue" to read.
- The add-on emails are deferred (`L2-057` AC2), so the form offers no extras, and `L2-057` AC5's
  "settings changed" email with its undo link can never be triggered by this journey's form.
- The design reads the newsletter's name, description and cadence from three settings, but nothing
  else in this journey varies them.
- `EmailMessage` has no headers (ADR 0070 adds them), and the only email the newsletter sends in
  this journey is the confirmation, so the Unsubscribe link and its headers (`L2-058` AC4) would
  otherwise have no email to ride in.
- The confirm and unsubscribe screens have no loading state in the mocks, and the unsubscribed
  state names an address that a purged subscription no longer has.
- The design leaves the purge's cadence, the stories-a-week window and the first issue's time open.

## Decision

- **Endpoints.** Under `api/public/newsletter`, all `[AllowAnonymous]`, each sending one MediatR
  request:
  - `POST subscriptions` with `{ email }` answers 202 with no body, the same for a new, pending,
    subscribed or unsubscribed address. A malformed address is refused 400 `validation_failed` with
    `fieldCodes.email` = `email_invalid` (the Join shape of ADR 0008, at most 254 characters). Before
    anything else, `SubscriptionLimiter` (one more `AddressRateLimiter`) allows 5 a sliding hour per
    network; the sixth is refused 429 `too_many_attempts`. Every submission counts and none is given
    back, so the limit says nothing about addresses.
  - `POST confirmations` with `{ token }` answers `{ email, firstIssueAt }`, or 400
    `subscription_link_expired` for an unknown, used or expired link, changing nothing.
  - `POST unsubscriptions` with `{ token }` answers `{ email }`, or `{ email: null }` for an unknown
    or purged token; it never refuses.
  - `POST unsubscribe?token=` is the one-click address of `List-Unsubscribe` (RFC 8058). It is
    marked `[IgnoreAntiforgeryToken]`, which the antiforgery filter now honours, because a mail
    provider posts it from no page of the app; the token is its only credential. It answers 200
    with no body, for any token.
- **What a submission does.** The address is trimmed and lower-cased. None stored: a Pending
  `NewsletterSubscription` is created. Pending or Unsubscribed: it becomes Pending again with
  `RequestedAt` = now. In those cases a `SubscriptionConfirmation` is issued (SHA-256 hash of 32
  random bytes in base64url, 7 days, single use) and the confirmation email is queued through
  `IEmailSender`. Subscribed: nothing changes and no email is sent, since the form submits no
  extras. Confirming sets Subscribed, `ConsentedAt` and `ConsentSource` = "Confirmation link", clears
  `UnsubscribedAt` and marks every open confirmation of the subscription used. Unsubscribing sets
  Unsubscribed and `UnsubscribedAt` the first time only, and marks open confirmations used, so an
  older confirmation link cannot subscribe the address again behind its owner's back.
- **Every newsletter email's footer and headers.** `EmailMessage` gains `Headers`, limited to
  `List-Unsubscribe` and `List-Unsubscribe-Post`; any other name throws before sending, and the SMTP
  transport writes them. `Html` waits for the issue in journey 29. `NewsletterEmails` writes the
  confirmation email: who sent it and why, the one link `<MemberApp:BaseUrl>/subscribe#confirm=…`,
  that ignoring it subscribes nobody, then the footer every newsletter email shares: Christian
  Fitness, `Organisation:PostalAddress`, and Unsubscribe at
  `<MemberApp:BaseUrl>/subscribe#unsubscribe=…`, with `List-Unsubscribe:
  <<MemberApp:BaseUrl>/api/public/newsletter/unsubscribe?token=…>` and `List-Unsubscribe-Post:
  List-Unsubscribe=One-Click`. The confirmation email is the first email the newsletter sends, so it
  carries the footer too, and unsubscribing from it turns a Pending address Unsubscribed.
- **Unsubscribe tokens.** Each email gets its own random token; only its hash is stored, in
  `NewsletterUnsubscribeTokens` with the subscription's id (ADR 0078). Tokens never expire, do not
  depend on Data Protection keys, survive a resubscription of the same record and are deleted with
  it.
- **`Organisation:PostalAddress`** is required outside Development, beside the other email
  settings, so a deployed API never sends a newsletter email without the address the law asks for.
- **Access logs.** The one-click address carries its token in the query string, so the member
  server's nginx access log uses a format of `$uri` without arguments (ADR 0078).
- **Purges.** The publishing clock (ADR 0069) runs `PurgeNewsletterSubscriptionsCommand` on each
  tick it holds the lease, after the due stories: a Pending subscription whose `RequestedAt` is 30
  days old and an Unsubscribed one whose `UnsubscribedAt` is 29 days old are deleted with their
  confirmations and unsubscribe tokens. The query is indexed by status and time, and running it each
  tick needs no second schedule; the day's margin keeps "within 30 days" after an outage of a day.
- **The first issue.** `firstIssueAt` is the next Saturday at 7 AM in Toronto after the
  confirmation, the Weekly's cadence; the screen words it "on Saturday at 7 AM".
- **What waits for journey 29.** Subscribe's latest-issue preview, "Read the full issue" and "Read
  last week's issue" in the success and confirmed panels are left out until an issue exists, and
  the newsletter's name, description and cadence are the screen's copy until issues use them. The
  three `Newsletter:*` settings are not added.
- **What waits for the extras.** The form, the API and the subscription carry no extras, and the
  "Your newsletter settings changed" email with its undo link is built with them.
- **Stand-ins.** While a confirmation or unsubscribe link is checked, the state area shows "Checking
  your link…" with `aria-busy="true"`, in place of the form. An unknown or purged unsubscribe token
  shows "You're unsubscribed" with "We won't email you again." in place of the address. A failed
  check shows the `error` alert above the form. A feed list that gets no answer shows the section's
  title and text with no list; a 5xx opens the server-error screen, as every GET does (L2-043 AC4).
  The plain masthead's "Back to news" is the ghost button in ink, as the legal pages' link is,
  because the button component has no muted ghost.
- **The screen.** `/subscribe` is a public route outside the member shell, so members and visitors
  see the same page. It reads one token from `#confirm=` or `#unsubscribe=`, drops it from the
  address bar with `Location.replaceState` before asking the API, and moves focus to the feeds
  heading at `#rss`. The design system's `newsletter-box` page gives the library its
  `cf-newsletter-box` (the landing rail) and `cf-subscribe` (the page's main column) components.
- **The landing page and footer.** The rail holds the join card, Upcoming events, the newsletter
  box and Most read, as the mock draws. "Subscribe free" opens Subscribe with the typed email in
  navigation state, never in the address; "Or follow by RSS" opens `/subscribe#rss`. The footer's
  news variant gains Newsletter (`/subscribe`), and RSS leads to `/subscribe#rss` (ADR 0108).
- **The feeds.** `GET /api/public/feeds` (`public-reads`) answers the six feeds, All stories first,
  each with `name`, its absolute `url` from `MemberApp:BaseUrl`, `storiesPerWeek` (stories published
  in the feed in the last 28 days, divided by 4 and rounded, halves up) and `isAll`. The
  library's `cf-feed-list` draws them; Copy URL uses `CLIPBOARD_SERVICE` and one `CopiedFlag`
  naming the feed last copied, so one row reads "Copied" at a time, and a
  refused clipboard selects the address text.

## Consequences

- The design-system page and the designs drop the extras and the reader count from Subscribe, as
  `L2-057` AC2 already says.
- A subscriber can unsubscribe from the confirmation email before confirming; that is a Pending
  address leaving, purged 29 days later.
- Without a latest issue, the success panel offers only "Use a different email" and the confirmed
  panel no action, until journey 29.
- The purge runs every 30 seconds while the lease is held; it reads two indexed ranges and usually
  deletes nothing.
