# 0062. Legal page versioning: the version in force is bundled, earlier versions are static files at dated addresses

## Status

Accepted, 24 November 2026.

## Context

L2-067 AC6 keeps earlier versions of the Privacy Policy and Terms of Service readable at their own
addresses, and AC7 serves the current documents as static pages bundled with the app. The design left
two points open: the address scheme, and whether superseded texts stay in the JavaScript bundle
(which would grow with every change; AGENTS.md makes the initial bundle and memory the top frontend
priority) or move out of it. The owner also decided how a new version is accepted.

## Decision

- **The version in force is the routed page** at `/privacy` and `/terms`, written in the page's
  template and bundled with its own lazy chunk, as the design describes.
- **Earlier versions are static HTML files**, one per version, at `/privacy/<yyyy-mm-dd>` and
  `/terms/<yyyy-mm-dd>` (the version's effective date, for example `/privacy/2026-11-01`). They are
  generated once when a version is superseded, kept in `frontend/projects/web/public/legal/`, served
  by nginx beside the app (ADR 0047) and never imported by the Angular code, so the bundle does not
  grow with each change. Each carries the title, the effective date, the text as it stood and a link
  to the version in force.
- **Acceptance is by continued use.** A change that matters is emailed to members and shown in the
  app at least 30 days before it takes effect; continued use after the effective date is acceptance.
  There is no blocking screen and no per-member record of acceptance; Join keeps recording the
  versions in force when the account was made (L2-067 AC5).
- **The notice is a service notice.** The email is transactional under CASL and is sent whatever the
  member's email preferences say (L2-064 AC3).

## Consequences

- The bundle stays flat however many versions exist; an old version costs one small file.
- A dated address is permanent, so a link in an old email keeps working.
- Without a record of acceptance, the team cannot show that a given member saw a version; the
  30-day notice and the dated archive are the evidence.
