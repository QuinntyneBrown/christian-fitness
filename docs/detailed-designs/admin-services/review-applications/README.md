# Review professional applications

## Overview

Christian Fitness lists Christian professionals the team has vetted: trainers, dietitians, physios and counsellors. Members find them on the Services screen of the Member web app. A professional reaches that screen only after staff approve an application.

- **professional application** — request from a member to be listed as a professional, holding role, category, credentials, where, price and about
- **application queue** — list of applications in the `Pending` state, shown on the Manage Services screen
- **listing** — published `ServiceListing` that members see on Services

This feature covers the staff side of that gate. An Admin opens Manage Services in the Admin web app, reads each pending application, and approves or declines it. Approval publishes a listing. Decline records a reason and publishes nothing. Either decision removes the application from the queue. The feature belongs to the admin-services subsystem, next to taking in applications (L2-026) and editing and removing listings (L2-027).

Staff roles come from L2-019: a Moderator receives HTTP 403 on every services endpoint, and an Admin may perform every action.

## Description

The slice runs from the Manage Services screen to the database. The screen follows the mock `docs/mocks/pages/admin-services/` (states `default`, `decided`, `no-applications`, `loading`, `empty`, `error`).

- **`ManageServicesPage`** — routed, lazily loaded page in `projects/admin`. It holds the queue as a signal, calls the contract, and branches on error `code` values. It renders the `applications` list and the "Live listings" table.
- **`ApplicationCard`** — presentation component in the `components` library, BEM block `application` (`application__head`, `application__role`, `application__creds`). It shows avatar, name, submitted time, role and credentials, and emits `approve` and `decline` outputs. Its buttons carry accessible names such as "Approve Lena Park, RD".
- **`AdminServicesApi`** — contract in the `api` library, provided through the `ADMIN_SERVICES_SERVICE` token. `HttpAdminServicesService` implements it and `app.config.ts` binds it.
- **`AdminApplicationsController`** — ASP.NET Core controller under policy `AdminOnly`. Each action sends one MediatR request and checks nothing itself.
- **`ListPendingApplicationsQuery`** and **`ListPendingApplicationsHandler`** — return `PendingApplicationDto` items with name, role, credentials and submitted time, ordered by `SubmittedAt` ascending. The queue holds at most 50 applications, and the answer carries `total`, the number waiting in all (ADR 0000).
- **`ApproveApplicationCommand`** and **`ApproveApplicationHandler`** — `POST /api/admin/services/applications/{id}/approve`. Load the application, call `ProfessionalApplication.TryApprove`, add the returned `ServiceListing`, record the audit entry `application.approved`, and save all in one unit of work. The answer is `ApplicationDecisionDto` (`applicationId`, `status`, `listingId`) (ADR 0050).
- **`DeclineApplicationCommand`**, **`DeclineApplicationValidator`** and **`DeclineApplicationHandler`** — `POST .../{id}/decline` with `{ reason }`. The validator requires a reason (`reason_required`) of at most 500 characters once trimmed (`reason_too_long`), both named in `fieldCodes`. The handler calls `ProfessionalApplication.TryDecline`, records the audit entry `application.declined` (never the reason) and saves. No listing is created. The reason is kept on the application for staff, is never logged and is not sent to the applicant.
- **`ProfessionalApplication`** — domain entity owning the transitions `Pending → Approved` (`TryApprove`) and `Pending → Declined` (`TryDecline`). A decided application accepts no further transition: both answer false.
- **`ServiceListing`** — domain entity for a published listing: the applicant's name when approved, role, category, credentials, where, price, about, `PublishedAt` and its source application. Members browse it in slice 16.1; staff edit and remove it in slice 23.

Deciding an application that is missing is refused 404 `application_not_found`, and one already decided 409 `application_decided` (ADR 0050). The prototype draws no decline-reason input, so the dialog `DeclineApplicationDialog` follows the mock `docs/mocks/dialogs/decline-application/` (states `default`, `invalid`, `busy`, `failed`, `refused`), and the page gains the state `failed` for an approval that does not go through. A decided card stays in the list and says how it was decided, as the mock `decided` draws it. The applicant is not notified of the decision (ADR 0050).

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-025` | `L1-011` | Review professional applications. Given pending applications, when an Admin opens Manage Services, then each shows name, role, credentials and submitted time, oldest first. Given an application, when an Admin approves it, then a published listing is created and the application leaves the queue. Given an application, when an Admin declines it with a reason, then no listing is created and the application leaves the queue. Given no pending applications, when the queue loads, then an empty state says there is nothing to review. |

## Diagrams

### System context

A professional submits an application to Christian Fitness, and an Admin decides it. Telemetry leaves the system without personal data.

![C4 system context for reviewing professional applications](diagrams/c4-context.png)

### Containers

The Admin web app calls the Christian Fitness API, which reads and writes the Christian Fitness database. The CLI owns migrations.

![C4 container view for reviewing professional applications](diagrams/c4-container.png)

### Components

`ManageServicesPage` depends on the `ADMIN_SERVICES_SERVICE` contract. `AdminApplicationsController` dispatches one query and two commands to their handlers.

![C4 component view for reviewing professional applications](diagrams/c4-component.png)

### Class structure

`ProfessionalApplication` holds an `ApplicationStatus` and creates a `ServiceListing` on approval. Each handler depends on `IAppDbContext`.

![Class diagram for reviewing professional applications](diagrams/class-structure.png)

### Behaviour — load the queue

The handler returns pending applications oldest first (L2-025 AC1). An empty result shows the empty state (L2-025 AC4).

![Sequence diagram for loading the application queue](diagrams/sequence-load-queue.png)

### Behaviour — approve an application

Approval creates a published listing and saves it with the application in one unit of work (L2-025 AC2).

![Sequence diagram for approving an application](diagrams/sequence-approve.png)

### Behaviour — decline an application

The validator requires a reason. The handler declines the application and creates no listing (L2-025 AC3).

![Sequence diagram for declining an application](diagrams/sequence-decline.png)
