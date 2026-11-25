# 0062. Which areas a Moderator opens (amends ADR 0020)

## Status

Accepted, 24 November 2026. Amends ADR 0020: its table of what a Moderator may open is replaced
by the one below; the rest of ADR 0020 stands.

## Context

ADR 0020 gave a Moderator the `Console`, `Dashboard` and `Members` areas and closed every other
area, including any a later slice had not named (`Unlisted`). Since then the admin console grew
six areas (Stories, Newsletter, Event series, Community Pick, Listings and Feedback), and the
mocks gave a Moderator none of them (mocks README, open question 8). `canManage`, the API's
`StaffAccess` table, `L2-019` and the navigation all depend on the answer. `L2-019` AC5 also
named only Events and Services in its "Admins only" sentence.

## Decision

- **The table.** Stories stays Admins only (`L2-068` AC7). Newsletter, Event series, Community
  Pick, Listings (and listing suggestions) and Feedback are opened by an Admin or a Moderator.
  Events and Services keep ADR 0020's rule.

  | Area | Admin | Moderator |
  |---|---|---|
  | Console, Dashboard, Members | yes | yes |
  | Newsletter | yes | yes |
  | Event series | yes | yes |
  | Community Pick | yes | yes |
  | Listings | yes | yes |
  | Feedback | yes | yes |
  | Stories | yes | no |
  | Events | yes | no |
  | Services | yes | no |
  | Any segment no area names (`Unlisted`) | yes | no |

- **`StaffAccess.Allows(role, area)` is still the one rule.** `StaffArea` gains a member for each
  new area a controller is routed under (`Publishing` for Stories, which keeps the name
  `manage-stories` gave it, `Newsletter`, `Series`, `CommunityPick`, `Directory`, `Feedback`); Admin is allowed every area, and a Moderator `Console`, `Dashboard`,
  `Members`, `Newsletter`, `Series`, `CommunityPick`, `Directory` and `Feedback`. `Publishing`, Events,
  Services and `Unlisted` refuse a Moderator with 403 `forbidden_role`; the fail-closed default
  for an unnamed segment is unchanged. The frontend rows of the same table are `canManage(role,
  area)` and `areasFor(role)`, held in both suites.
- **Inside an open area an Admin may still do more where a requirement says so.** The one case is
  Feedback: "Open the story to correct it" opens the story editor, which is Stories, so only an
  Admin is offered it (`L2-074` AC4).
- **The "Admins only" words are general.** The screen reads "Only Admins can open this area. As a
  moderator, you can open the areas in your navigation, starting from the Dashboard." with the
  note "Need to manage this area? Ask a community director to make you an admin." It no longer
  names Events and Services, so a later Admins-only area needs no change to it.
- **The navigation** lists a Moderator Dashboard, Newsletter, Event series, Community Pick,
  Listings, Members and Feedback, without group names; the counts of Listings, Members and
  Feedback show as for an Admin.
- **The Dashboard** shows a Moderator the listing suggestions and new feedback lines of
  "Needs attention" as well as flagged members; the stories in review and the applications stay
  Admin only.

## Consequences

- Each area's endpoints are open to both roles and every audit entry they write names the actor
  as before (`L2-019` AC3).
- A new area is Admins only until its slice names it in the table, as before.
- Still not built, and recorded as known gaps in the staff-roles design: no screen grants or
  changes roles, and nothing reads or prunes the audit trail.
