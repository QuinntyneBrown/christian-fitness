# 0062. Directory search, suggestions and follow rules

Status: Accepted

## Context

Browse, suggest, follow and review left validation, limits and data sources open (issue 92, `docs/mocks/README.md` open question 11).

## Decision

- **Search.** The API treats `q` under 2 characters after trimming as absent and refuses `q` over 100 characters with 400 `query_too_long`. Matching is case- and accent-insensitive: a PostgreSQL nondeterministic ICU collation (`und-u-ks-level1`) on name, with a trigram GIN index for `ILIKE`.
- **Suggestion fields.** Name, kind and place are required; reason is optional. Limits: name 120, place 120, website 200 (`https` only), church connection 200, email 254, reason 1,000.
- **Rate window.** "5 suggestions a day" is a rolling 24 hours, like the other rate windows.
- **Decided suggestions.** They stay listed for 90 days and are purged at 12 months (erasure and retention). The console pages 50 at a time with "Load more".
- **Decline.** Asks for an optional reason, sent in the system message when given.
- **Website.** One not using `https` is not shown at all.
- **Listing data.** Connections, photos, focus tags and verified marks are set by staff in the listing editor, and by the owner except the verified mark; seed data is the stand-in until then.
- **Follow.** The button is `aria-disabled` while a request is in flight. Follows are limited to 60 an hour per member (`too_many_attempts`).

## Consequences

`L2-054`, `L2-055`, `L2-056`, `L2-062` and `L2-073` state each rule. Behaviour is built later in ATDD slices.
