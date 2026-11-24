# 0056. Landing with professionals

## Status

Accepted, 24 November 2026 (slice 8.2).

## Context

L2-001 asks the landing page for a professionals section. The mock drew only the "Trusted professionals"
paragraph, and the only listing read (`GET /api/services`) is for members. The design left the size, the
order and the public fields open.

## Decision

- **Mock.** The four landing states gained a "Meet our professionals" section of three `service-row`s in
  a list card (default), skeleton rows (loading), an inline empty message and an inline error with Try
  again. The mocks show both lists in the same state; the specs prove they load and fail independently.
- **Endpoint.** `GET /api/public/services/featured` is explicitly `[AllowAnonymous]` and answers the first
  three published listings by name (then id) with `name`, `role`, `category`, `where` and `price` and no
  other key: no listing or member id, contact link, credentials or about text. A hard limit of three
  mirrors the events list; the rows lead to Join, so they need no id. Initials come from the name in the
  avatar. No setting is needed.
- **Below the fold without `@defer`.** `@defer` grew the initial bundle by 8 to 10 kB (its runtime joins
  `main`; web was 289.9 kB against a 280.21 kB base), so a small directive (`cfLandingProfessionalsOnView`)
  watches a placeholder with an `IntersectionObserver` (200 px margin) and then imports and creates the
  component. The observer is released with the page, and the component loads its own data, so the events
  and professionals fail apart. Without `IntersectionObserver` it shows at once.
- **Errors.** As for events, a 5xx opens the server-error screen (ADR 0006); any other failure is the
  inline error.
