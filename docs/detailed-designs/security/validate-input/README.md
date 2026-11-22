# Validate input

## Overview

Every request body that reaches the Christian Fitness API is untrusted. This
feature defines one path for checking it and one shape for refusing it, so each
screen branches on a stable error `code` and shows a generic message. It also
covers the opposite direction: user-supplied text is always rendered as text,
never interpreted as HTML.

- **ProblemDetails** — RFC 9457 JSON error body; Christian Fitness adds a `code` extension a client branches on
- **field errors** — map from request field name to validation messages, carried in the `errors` member of a 400 response
- **generic message** — fixed, non-technical sentence a screen shows in place of server detail

## Description

- **`XxxValidator`** — one FluentValidation validator per command in `ChristianFitness.Application` (for example `CreateAccountValidator`, `SendMessageValidator`, `SaveEventValidator`).
- **`ValidationBehavior<TRequest,TResponse>`** — MediatR pipeline behaviour that runs every validator for a request before its handler and throws `ValidationException` with the failures. It arrives with the first request body (slice 2.1); slice 1.2 registers MediatR and the validators of `ChristianFitness.Application`.
- **`ProblemDetailsExceptionHandler`** — `IExceptionHandler` in the API. It maps `ValidationException` to 400 with `code` (`validation_failed` by default, or a command-specific code such as `message_invalid`) and `errors`; known domain exceptions to their status and `code`; any other exception to 500 with title only and code `server_error`. Stack traces and exception messages are never written to the response in any environment. Slice 1.2 builds the 500 branch; the 400 branch comes with `ValidationBehavior`.
- **Status-code ProblemDetails** — `AddProblemDetails` with `UseStatusCodePages` gives every bodiless error a ProblemDetails body, and `ProblemCodes.ForStatus` adds its `code`: 401 `unauthenticated`, 403 `forbidden`, 404 `not_found`, 500 `server_error` (`L2-032` AC4).
- **`ApiError`** — DTO in the frontend `api` library: `{ status, code, errors? }`. `HttpXxxService` implementations convert `HttpErrorResponse` to `ApiError`.
- **`errorMessage(code)`** — pure helper in the `domain` library that maps a `code` to the screen's generic message; unknown codes fall back to "Something went wrong. Please try again." `<TO SUPPLY: final copy per mocks>`.
- **Text rendering** — templates bind user text with interpolation (`{{ }}`) or `[textContent]`, never `[innerHTML]`. The Admin and Member web apps lint against `innerHTML` bindings <TO SUPPLY: lint rule choice>. Field errors from `errors` are shown beside fields with `aria-invalid` and `aria-describedby`.
- **Mock states** — `pages/join/` invalid state and `pages/server-error/` show the field-error and generic 500 presentations.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier. The
specification states these as acceptance criteria rather than one `shall`
sentence, so the criteria are quoted.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-032` | `L1-013` | 1. Given any request body, when it fails validation, then the API returns 400 ProblemDetails with a `code` and field errors, and the screen shows a generic message. 2. Given an unexpected server error, when it occurs, then the response is a 500 ProblemDetails with no stack trace or internal detail. 3. Given user-supplied text, when rendered anywhere, then it is shown as text, never as HTML. 4. Given any error response (401, 403, 404, 500), when served, then its body is ProblemDetails with a `code` a client can branch on. |

## Diagrams

### System context

Members and staff submit forms through Christian Fitness; the system checks every body it receives.

![C4 system context: validate input](diagrams/c4-context.png)

### Containers

The Christian Fitness API validates request bodies before any handler touches the database; both apps render errors and user text safely.

![C4 container view: validate input](diagrams/c4-container.png)

### Components

The MediatR validation behaviour runs FluentValidation validators ahead of each handler; the exception handler turns failures into ProblemDetails.

![C4 component view: validate input](diagrams/c4-component.png)

### Class structure

`ValidationBehavior` aggregates every `IValidator<TRequest>`; `ProblemDetailsExceptionHandler` maps exception types to status and `code`; the frontend `ApiError` mirrors the response.

![Class diagram: validate input](diagrams/class.png)

### Behaviour — refuse an invalid body

Validators run before the handler; a failure returns 400 with a `code` and field errors, and the screen shows the generic message.

![Sequence diagram: refuse an invalid body](diagrams/sequence-validation-failed.png)

### Behaviour — answer an unexpected error

Any unhandled exception becomes a 500 ProblemDetails that carries a title and trace id only.

![Sequence diagram: answer an unexpected error](diagrams/sequence-unexpected-error.png)

### Behaviour — render user text safely

A member's message or name that contains markup is bound by interpolation, so Angular escapes it and the browser shows the characters.

![Sequence diagram: render user text safely](diagrams/sequence-render-as-text.png)
