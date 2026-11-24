# 0050. Browse professionals

## Status

Accepted, 24 November 2026 (slice 16.1).

## Context

L2-013 lets a member browse the published listings on Services, filter them by category and read the
selected one's card. Approving an application already publishes a `ServiceListing` (ADR 0049) and the
Services page already hosts "Apply to be listed" (ADR 0047). The detailed design
(`docs/detailed-designs/services/browse-services/`) left the paging, the category address, the
error code for an unknown category and the narrow-screen behaviour to supply, and the mocks have no
state for a category with nobody in it. The full listing screen (credentials and price on a route of
its own) is slice 16.2, and contacting or booking a professional is slices 17.1 and 17.2.

## Decision

- **Endpoint.** `GET /api/services?category=` for any signed-in member (the fallback policy refuses a
  visitor 401; there is no staff policy). One MediatR query answers `{ total, services }`: the listings
  in `Name` then `Id` order, at most 50, with `total` counting every match so the cap is never silent
  (the same shape as the application queue, ADR 0048). Each listing carries `id`, `name`, `role`,
  `category`, `where`, `price`, `credentials`, `about` and `publishedAt`; one DTO serves the row and
  the card, so choosing a row asks for nothing more. No contact detail, member id or application id is
  served.
- **No paging.** Listings are staff-approved professionals, few enough for one answer; the cap of 50
  bounds the answer and the page's memory. A cursor joins when a real directory outgrows it.
- **Category.** The five exact names `Training`, `Nutrition`, `Physio`, `Coaching`, `Counselling`, with
  their capitals (the names the application stores and the list serves). An unknown name is refused
  400 `validation_failed` with `fieldCodes.category` = `category_invalid`; the web app never asks for
  one, because it reads the address through `serviceCategoryOf`, which shows All for anything unknown.
  One table of 11 cases runs in both stacks (`ListServicesValidatorTests`, `service-category-filter.spec.ts`).
- **Removed listings.** L2-013 AC5 (a removed listing is not shown) holds because a listing that exists
  is published (ADR 0049); slice 23 deletes the row. There is nothing to filter and nothing to test
  until then.
- **Address.** `/services?category=Nutrition&selected={id}`. Choosing a chip or a row is a navigation, so
  the address, the back button and a reload agree; only a category change asks the API again. A
  `selected` id that is not in the list, and none, show the first listing's card (mock `services/default`
  has the first row current).
- **Components.** `ServiceRow` (block `service-row`) and `ServiceDetail` (block `service-detail`) are
  library components built from `Avatar`, `Card`, `DescriptionList` (`spec-list`) and `Skeleton`; the
  list is `cf-list variant="card"` and the layout `cf-split variant="services"`. The mock's row reused
  the `mini-row__*` classes of another block; each block here owns its elements
  (`service-row__name`, `service-detail__role`), which the page object locates. Every text is rendered
  as text; the avatar is the person's initials (a listing has no photo yet).
- **The verified line.** "Verified by Christian Fitness, March 2026" is the approval's month and year in
  Toronto time (`verifiedText`, with a table of cases around midnight at a month boundary); the listing
  needs no new field.
- **Navigation.** Services joins the member destinations: the top bar's links and the tab bar's five
  items. Specs that listed the old four updated in the same slice.
- **Fixture.** `GET /api/services` answers nobody listed by default, so the specs that open `/services`
  stay green.

## Deviations and stand-ins

- **Below LG the card follows the list in the same page** rather than opening as its own screen with a
  back action (L2-013 AC4). Slice 16.2 adds that screen with the credentials and price route; adding
  a second route here would have built it twice. Choosing a row below LG updates the card under the
  list, which is the "Services" mock at one column.
- **No "Request a booking" or "Message" on the card.** The mock draws them, but they belong to slices
  17.1 and 17.2; an inert button would be a control that does nothing. They join with those slices.
- **A category with nobody in it** has no mock state. It reuses the empty state (heading "Nothing
  here yet", the text `No {category} professionals right now. New ones are listed as the team
approves them.`, and a "Clear filter" button), as Events does for a category with no events.
- **The error state** has no support reference line: the page shows the generic sentence the mock
  shows and a Try again, and a 5xx opens the server-error screen, which carries the reference.

## Consequences

- Services makes one request on arrival and one per category change; the previous request is
  cancelled, and the client, the request and the rows go with the screen. The initial bundle did not
  grow (web 280.30 kB); the page, its components and the client load lazily with the route.
