# 0008. Join refusals: one rule table in both stacks, a validation behaviour and a 409 for a taken email

## Status

Accepted, 22 November 2026 (slice 2.2).

## Context

Slice 2.1 stores what the Join form sends without checking it, and a failed join gives the form
back with no message (ADR 0007). Slice 2.2 adds the refusals of L2-003: a taken email, compared
case-insensitively, is named on the email field with "An account with this email already exists.
Sign in instead?" (AC2); a short password, a missing name or a malformed email are named field by
field and nothing is created (AC3); an over-long name or home church is refused by the server with
code `field_too_long` (AC6). L2-032 AC1 asks every invalid body to be answered 400 ProblemDetails
with a `code` and field errors, and the screen to show a generic message.

The validate-input design left the copy of the generic messages and the way `innerHTML` bindings
are kept out `<TO SUPPLY>`. The mocks drew the taken email (`invalid`) and the server failure
(`error`), but not the fields named by the form itself, nor a refusal by the server.

## Decision

- **One rule table, in both stacks.** The Join rules are checked by the form before anything is
  sent and again by the API, with the same cases:

  | Field       | Refused when                                                   | Message (form)                               |
  | ----------- | -------------------------------------------------------------- | -------------------------------------------- |
  | Full name   | blank or white space                                           | Enter your full name                         |
  | Full name   | more than 100 characters, trimmed                              | Use 100 characters or fewer                  |
  | Email       | blank, or not `local@domain.tld` with no space and one `@`     | Enter an email address like name@example.com |
  | Email       | more than 254 characters, trimmed                              | Use 254 characters or fewer                  |
  | Password    | fewer than 8 characters, as typed                              | Use at least 8 characters                    |
  | Home church | more than 120 characters, trimmed (optional: blank is allowed) | Use 120 characters or fewer                  |
  | Interests   | a key not in the list of interests                             | (the form offers only known keys)            |

  The email pattern is `^[^\s@]+@[^\s@]+\.[^\s@]+$` in both stacks. Each suite carries the same
  inline case table (`validateJoin` in `domain`, `CreateAccountValidator` in Application), as
  AGENTS.md asks of a rule computed in both stacks.
- **The API validates in a MediatR pipeline behaviour.** `ValidationBehavior<TRequest,
  TResponse>` runs every FluentValidation validator of the request before its handler and throws
  FluentValidation's `ValidationException` with the failures. `ProblemDetailsExceptionHandler`
  answers it with 400 `ValidationProblemDetails`: `errors` keyed by the camel-case field name
  (`fullName`, `email`, `password`, `homeChurch`, `interests`) with fixed sentences that never
  repeat the value sent, and `code` `field_too_long` when any failure is a length over its limit,
  else `validation_failed`. The handler is not reached, so nothing is created. Only a 500 is
  logged; a refusal is the client's, not an incident.
- **A taken email is a 409 with code `email_taken`.** `CreateAccountHandler` looks the email up
  by `NormalizedEmail` (trimmed, lower case) before it hashes anything, and throws
  `RefusalException` (Application) with the code and the kind `Conflict`, which the exception
  handler answers 409. Two joins with one email at the same moment both pass the lookup; the
  database's unique index refuses the second save, and the handler answers that
  `DbUpdateException` with `email_taken` when the email is now stored, so the visitor sees the
  same message and never a 500. EF Core InMemory raises no such exception, so the test injects it
  through `IAppDbContext`.
- **The message names that the email is registered.** L2-003 AC2 asks for it in so many words,
  so Join tells a visitor that an address has an account, as most consumer sign-ups do. The
  sign-in screen keeps its generic message (L2-004 AC2), and the limit of five account creations
  per IP address an hour (L2-034 AC2) bounds how fast addresses can be tried; that limit is the
  rate-limiting slice's.
- **The form names each invalid field and sends nothing.** `validateJoin` (a pure helper in
  `domain`) returns one message per invalid field, in the form's order. The page shows the mock's
  error summary above the form, the `form-alert` "Check your details" with one link per field,
  and each field's `field__error`, with `aria-invalid="true"` and `aria-describedby` pointing at
  the error instead of the hint. The summary takes focus when it appears, and a link in it moves
  focus to its field. Editing a field clears that field's error; the others stay until the next
  submit.
- **The answer decides what the screen says**, through `joinRefusalOf` in `domain`, which takes
  the `ApiError` (`status`, `code`, `errors`) that `HttpAccountService` makes of an
  `HttpErrorResponse` with `apiErrorOf`:
  - `email_taken` puts the AC2 sentence on the email field, with "Sign in instead?" linking to
    `/sign-in` (the mock `invalid`); changing the email clears it.
  - any other 4xx shows the generic `form-alert` "Check your details" / "Some of your details
    weren't accepted. Check each field and try again." (the new mock state `refused`): the form
    already checks the same rules, so this answer means the rules disagree or the request was
    made by hand, and the server's field sentences are not shown (L2-032 AC1).
  - a 5xx or no answer shows the mock `error`: "We couldn't create your profile" / "Our servers
    didn't respond. Everything you typed is still here, so try again in a moment." Everything
    typed stays.
- **Two mock states were added before code:** `invalid-fields` (the summary and the three field
  errors) and `refused` (the generic message), in `docs/mocks/tools/screens_member.py`.
- **New presentation components:** `FormAlert` (`cf-form-alert`, the `form-alert` block, with a
  title and either a sentence or a list of links to fields) and the `error` of `TextField` (a
  sentence and an optional link after it). `AuthLayout` gains the `[slot=alert]` above the fields
  (`auth__alert`).
- **User text stays text.** Every message on the Join screen is a fixed sentence of the client;
  no server string is rendered. Templates bind user text with interpolation, which Angular
  escapes; no lint rule is added for `[innerHTML]` (angular-eslint has none, and a home-made
  structural check is what AGENTS.md rules out). A behaviour spec proves a name holding markup
  is greeted as characters (L2-032 AC3).
- **"Sign in instead?" opens `/sign-in`,** which the not-found screen answers until slice 3.1
  builds sign-in, like the form's "Sign in" link since slice 2.1.

## Consequences

- A client that skips the form's checks gets the same refusals from the API, so the rules hold for
  any caller.
- A rule change touches both suites' tables; a difference shows as the generic `refused` message
  rather than a silent acceptance.
- Every later command with a validator is refused the same way with no further wiring: the
  behaviour runs for every MediatR request.
