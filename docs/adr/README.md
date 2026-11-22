# Architecture decision records

One file per decision, numbered in the order they were taken. A departure from `AGENTS.md` or
from the platform's best practice needs one (AGENTS.md, "Prefer best practice").

| #                                                              | Decision                                                                          | Status   |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| [0001](0001-angular-22-workspace-layout.md)                    | Angular 22 workspace: two apps, three source libraries                            | Accepted |
| [0002](0002-eslint-boundaries-for-the-dependency-direction.md) | eslint-plugin-boundaries enforces the dependency direction                        | Accepted |
| [0003](0003-video-tooling.md)                                  | Narrated films made with local tools: Kokoro, a deck seeked frame by frame, ffmpeg | Accepted |
| [0004](0004-postgresql-and-the-backend-packages.md)            | PostgreSQL, and the packages of the backend skeleton                              | Accepted |
| [0005](0005-github-actions-ci.md)                              | GitHub Actions CI: two sparse jobs, five-minute timeouts, no retries              | Accepted |
| [0006](0006-error-screens.md)                                  | Error screens: lazy routes, links that reload, an interceptor waiting for its client | Accepted |
| [0007](0007-join-session-and-home-stand-in.md)                 | Join: a session from the first request, a Home stand-in and the member app's HTTP client | Accepted |
| [0008](0008-join-refusals.md)                                 | Join refusals: one rule table in both stacks, a validation behaviour and a 409 for a taken email | Accepted |
| [0009](0009-sign-in-sign-out-and-request-protections.md)      | Sign in and sign out: a session endpoint, antiforgery tokens, security headers and a member shell | Accepted |
| [0010](0010-password-reset-request-and-email.md)              | Password reset request: one answer for every email, hashed tokens and a queued email sender | Accepted |
| [0011](0011-staff-sign-in-and-admin-shell.md)                  | Staff sign-in and the admin shell: a staff cookie scheme, a shared credential check and a navigation band | Accepted |
| [0011](0011-sign-in-protections.md)                           | Sign-in protections: a failure window in the database, a suspended refusal, a checked return address and a join limit per address | Accepted |
