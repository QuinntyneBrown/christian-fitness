# 0006. Error screens: lazy routes, links that reload, and an interceptor waiting for its client

## Status

Accepted, 22 November 2026 (slice 30.1).

## Context

L2-043 asks both apps to answer an unknown URL with a not-found screen and an unrecoverable
server error (a 5xx from the API) with a server-error screen, each with the way back its mock
shows, and the API to give every server error a reference. `AGENTS.md` makes lazy loading and
the initial bundle the top frontend priority, keeps the components library free of the router
and app services, and asks for a rule with many cases to live in a tested helper.

When this slice starts, neither app sends a request to the API: no screen loads data yet, and
`HttpClient` is not provided. Providing it, with one interceptor, was measured on the member app:
the initial total went from 212.29 kB to 232.19 kB (+19.9 kB raw), past the 220 kB warning
budget, for a client nothing calls.

## Decision

- **Not found is the wildcard route,** `{ path: '**', loadComponent }`, in each app, so it is a
  lazy chunk. Every route has a `title`, so the router's default title strategy sets the document
  title on every navigation, including back to the first route.
- **Server error is a lazy route, `server-error`,** that the app navigates to with
  `skipLocationChange`, so the address bar keeps the URL that failed. Its query parameters carry
  the `reference` and the URL to return to (`from`); the screen shows a reference only when it is
  well formed (`CF-` and eight upper-case hexadecimal digits) and returns only to a path inside
  the app (otherwise `/`). Both rules are helpers in `domain` with unit tests. The page reads the
  parameters once from the route snapshot; binding them to inputs with
  `withComponentInputBinding()` was measured at +2.4 kB initial. The interceptor does not open
  the screen again while it is showing, so the snapshot cannot go stale.
- **The actions are plain links that load a document** (`<a href>`), not router links. "Try
  again" loads the URL that failed again from the server, which also picks up a new deployment
  and drops whatever state failed; the components library stays free of the router. The
  `Button` component renders the link; the `ErrorPage` component renders the block.
- **`serverErrorInterceptor` lives in `domain`, with unit tests, and is not registered yet.** It
  shows the server-error screen for a GET to `/api/` that answers 5xx and passes every other
  failure to the caller (writes show their own failed state; offline is slice 30.2). The first
  slice that loads data provides the client with
  `provideHttpClient(withInterceptors([serverErrorInterceptor]))` in both apps' `app.config.ts`
  and adds the end-to-end spec "a 5xx while loading shows the server-error screen" through this
  slice's `ServerErrorPage` page object. Until then the screen is proven end to end by opening
  its route with the query parameters the interceptor sends, and the interceptor by its unit
  tests.
- **The reference comes from the API.** Every 5xx ProblemDetails carries `reference`, `CF-` and
  the first eight hexadecimal digits of the request's W3C trace id in upper case, so an operator
  finds the trace from what the member quotes. A 4xx carries none.
- **The initial warning budget rises from 220 kB to 225 kB** in both apps; the error budget stays
  at 250 kB. The screens' rendering (text, content projection, a sanitised link, signal inputs)
  added about 5 kB of `@angular/core` instructions that any screen with content needs; a view
  query (about 8 kB) and class bindings (about 4.6 kB) were measured and avoided. The third lazy
  route then turned on Angular's chunk optimizer, which folds the shared initial chunk into `main`:
  about 2 kB more raw, 1 kB less to transfer and one request fewer. Each app measures 220.4 kB raw
  (57.4 kB to transfer, against 56.7 kB before the slice).
- **Unit tests run with Vitest** through the CLI's unit-test builder, as ADR 0001 planned: a
  `test` target on `domain`, `npm test`, and `happy-dom`, which the builder needs for a test run
  without a browser. They run locally, not in CI.

## Consequences

- The two pages are lazy chunks of 1 to 2 kB, and `Button` and `ErrorPage` share a lazy chunk of
  about 4.6 kB; the initial bundle grows only by the framework instructions above. The
  interceptor costs nothing until it is registered.
- Choosing an action reloads the app. That is slower than an in-app navigation, and is accepted
  for recovery from an error.
- The `server-error` route can be opened directly; it then shows the screen without a reference
  and returns to `/`.
- Until the first data-loading slice registers the interceptor, a 5xx from the API does not show
  the screen, because no screen sends a request.
