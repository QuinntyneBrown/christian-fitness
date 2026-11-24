# 0046. Offline banner and screen

## Status

Accepted, 23 November 2026 (slice 30.2).

## Context

Journey 30 (`journeys.detailed.md` row 39) requires both apps to show an offline banner when the
network drops on an open screen, and an offline screen with a way back when a route cannot load
because there is no connection. Two details in the earlier mocks needed settling before code:

- `home/offline` and `banner/warning` read "Showing what was saved at 8:42 AM", and `offline`
  read "Messages you write and registrations you make will send when you're back online". Neither
  app runs a service-worker data cache or background-sync queue; failed chat messages stay in the
  thread with their own Try again (ADR 0040), and failed writes keep what was typed on screen.
- `offline` had no admin counterpart, unlike `admin-not-found` and `admin-server-error` (ADR 0006).

## Decision

- **Honest offline copy and admin mock.** The warning banner reads `You're offline.` followed by
  `Pages you've opened stay on screen. Check your connection to load new updates.` (`role="status"`,
  non-dismissible while offline). The offline screen (`cf-error-page` with `code="Offline"` and
  `heading="You're offline"`) reads `Check your Wi-Fi or data, then try again when you're back
  online.`, with plain links for `Try again` (the URL that failed, checked by `returnPathOf`) and
  `Go to home` / `Go to dashboard` (`/`), matching ADR 0006. `admin-offline` joins the mock set.
- **Network status in `domain`.** `NetworkStatus` (`inject(DOCUMENT).defaultView`) exposes an
  `online` signal initialised from `navigator.onLine`, updated from `window` `online` and `offline`
  events, and cleaned up via `DestroyRef` (`L2-037` AC2). Both `MemberShell` and `AdminShell`
  (`cf-admin-layout` `[slot=banner]`) show `cf-banner` (`tone="warning"`) while `!online()`, and
  hide it as soon as `online` returns.
- **When the offline screen opens.** `offlineInterceptor` watches failed `GET` requests to `/api/`
  whose `HttpErrorResponse.status === 0` when `navigator.onLine === false`: it navigates to
  `/offline` with `skipLocationChange: true` and `queryParams: { from }`, keeping the URL in the
  address bar. When `navigator.onLine === true`, a `status === 0` failure passes on to the screen's
  own error state (`L2-043` AC5), and a write (`POST`, `PUT`, `PATCH`, `DELETE`) never opens the
  offline screen.

## Consequences

- `OfflinePage` in both apps is a lazy chunk (`loadComponent`); `returnPathOf` rejects `/offline`
  alongside `/server-error`, so `Try again` never loops to `/offline`.
- Existing Playwright specs that abort a backend request while the browser is online continue to
  reach each screen's own error state unchanged.
