# 0061. Addresses and slugs for sections, kinds, stories and picks

## Status

Accepted, 24 November 2026.

## Context

The landing page and directory put a selected name in the address, but the
requirements do not specify its spelling. Feed paths already use hyphenated
section names. Community Pick mocks show an event name in the short link while
`L2-072` specifies an id. Feedback needs to retain its context across sign-in,
reload and a story link change (`L2-061` AC8).

## Decision

- **Name slugs.** Each stack has one shared helper: lowercase the name, drop
  `&` and punctuation, and replace runs of spaces or hyphens with one `-`.
  Both implementations use the same case table:

  | Name | Slug |
  | --- | --- |
  | Faith & Body | `faith-body` |
  | Church Ministry | `church-ministry` |
  | Strength -- Training | `strength-training` |
  | Coach's Corner | `coachs-corner` |

- **Sections.** `/?section=<section-slug>`, for example
  `/?section=faith-body`, uses the same slug as `/<section-slug>/feed`,
  for example `/faith-body/feed`. An unknown section shows all stories in
  Latest, the landing page's all-stories view (`L2-001`).
- **Directory kinds.** `/directory?kind=<kind-slug>`, for example
  `/directory?kind=church-ministry`, uses the singular kind name. An unknown
  kind shows All, as on Events. Search may be combined as `&q=<text>`.
- **Community Picks.** `/e/<event-id>` uses the event's stable id, not a slug,
  and redirects to `/events/<event-id>` as in `L2-072`. Events have no slugs.
- **Feedback.** `/feedback?about=story:<id>` identifies a story by stable id;
  `/feedback?about=page:<route-template>` identifies a page by its route
  template, not a concrete path or a display title. Query values are URL
  encoded when needed, for example
  `/feedback?about=page:%2Fevents%2F%3Aid` for `/events/:id`. A route
  template identifies a page type, not a particular event; its display label
  cannot recover an individual event's name. A correction also selects its correction kind. The
  query survives reload and is preserved in the return address through sign-in;
  a story link change does not change the story id. A page route template
  contains no personal values.

## Consequences

The designs and mocks use these forms rather than inventing names or passing
context only in navigation state. The slug helper and shared case table are
implemented in later behaviour slices. Feedback context and query strings are
not logged; display labels are resolved separately from the identifier.
