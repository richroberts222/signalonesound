# S2 Organizations and Roles

**Status: APPROVED by the owner on 2026-10-09 (reviewed once by an independent reviewer). Built as its own issue; items under Owner decisions still need the owner.** Source: blueprint slice S2; product plan (Church/Ministry accounts); `/docs/permissions.md`. Depends on: S1. Owner decision recorded: organizer verification (a church must be claimed and approved before it can publish).

## Purpose

Let a person claim a Church/Ministry and, after a platform admin approves, manage it. This is the trust foundation for publishing events.

## Scope (in)

* Create or claim a Church/Ministry: name, 1 to 3 website or social links (minimum 1), short description, contact email for the review.
* A claim becomes a **manager request** with status pending, approved, rejected, or revoked. A claim of a name that already exists attaches the request to that organization instead of creating a second one; the organization record has status `pending` (no approved manager yet), `approved`, or `unpublished` (set by admins in S8). [Fable]
* Admin queue to approve or reject with a reason; manager list per organization; revoke a manager; a manager may invite another manager: the invite is a link to the claim page pre-filled with the organization, the invited person submits their own request, and the admin approves it (no invitee data stored). [Fable]
* Role checks through the central `can()` permission function; the admin allow-list lives on the server.
* Append-only audit log of role changes and admin decisions.
* Admin pages re-wired from the existing mock screens (Q-005 decides which mock code survives).

## Out of scope

Event creation (S3), payments or premium accounts, speakers, multi-level roles beyond manager and admin.

## Acceptance criteria

* **AC1** A member can submit a claim with 1 to 3 valid links (http or https only) and is told the request is pending; a second claim by the same member for the same organization while one is pending returns `409`. [Fable]
* **AC2** A claim cannot publish anything and gives no manager rights until approved.
* **AC3** Only a platform admin can approve or reject; every decision stores who, when and the reason in the audit log.
* **AC4** A user can never grant themselves a role by any request field (mass assignment test).
* **AC5** Two claims on the same organization go to the admin queue with both visible; the approval of one does not silently remove the other.
* **AC6** A manager sees and edits only organizations where they are an approved manager; a changed id returns `404`, not `403`, to avoid revealing existence.
* **AC7** Revoking a manager takes effect on their next request.
* **AC8** Names and descriptions are plain text with length limits; links are validated and shown with `rel="noopener noreferrer"`.
* **AC9** Rate limit on claims per user per day; duplicate-name warning for admins.
* **AC10** Audit log entries cannot be edited or deleted through any endpoint.
* **AC11** Data inventory rows exist for each new table.
* **AC12** `PATCH /organizations/:id` accepts only name, description and links; `GET /organizations/:id` returns only name, description, links and status for approved organizations and `404` otherwise; the contact email and manager list are never in a public response. [Fable]
* **AC13** When the account of an organization's only approved manager is deleted (S1), the organization keeps its events, reverts to `pending`, and the admin queue shows it as unmanaged. [Fable]

## Controls inventory

| Screen | Control | Test id | Action | Effect |
| --- | --- | --- | --- | --- |
| Claim a church | Name, description inputs | `claim-name-input`, `claim-description-input` | Enter | Validation messages |
| Claim a church | Add link, link input (1 to 3), remove link | `claim-add-link`, `claim-link-input-N`, `claim-remove-link-N` | Edit list | 4th link blocked |
| Claim a church | Contact email, Submit | `claim-email-input`, `claim-submit` | `POST /organizations/claim` | Pending status page |
| Dashboard | Organization switcher | `org-switcher` | Choose organization | Context changes |
| Managers | Invite, Revoke buttons | `managers-invite`, `managers-revoke-N` | Request or revoke | Updates list |
| Admin queue | Approve, Reject, reason input | `admin-approve-N`, `admin-reject-N`, `admin-reason-input` | Decision | Status and audit entry |

## API

`POST /organizations/claim` (member); `GET /organizations/:id` (public approved fields only); `PATCH /organizations/:id` (manager); `GET /me/organizations` (member); `GET /admin/manager-requests`, `POST /admin/manager-requests/:id/decision`, `GET /admin/audit` (admin); `POST /organizations/:id/managers/:userId/revoke` (manager or admin).

## Data

`organization(id, name, description, status, created_at)` T0; `organization_link(org_id, url, position)` T0; `organization_member(org_id, user_id, role, status, contact_email, requested_at, decided_at, decided_by, decision_reason)` T3 (person-to-church link is sensitive per the blueprint; never exposed publicly; `contact_email` is for the review only and is removed when the request is decided) [Fable]; `audit_log(id, actor_id, action, subject, at, detail)` T1 append-only, admin-read only because its rows reference person-to-church links [Fable]. Constraints: at most 3 links per organization; unique approved manager per (org, user).

## Hostile cases

Role injection, changed organization ids, self-approval by a manager who is also a member, javascript: and data: links, extremely long names, concurrent approvals, approving a rejected request, replaying a decision.

## Automation shipped with the slice

Permission matrix tests for every role and operation (generated from `/docs/permissions.md`); API and hostile tests; audit append-only test; E2E for the claim, approve, manage flow with two browser sessions; accessibility scan; mutation proofs (remove an ownership check; see the test fail).

## Owner decisions

Who in the platform may approve (the shared admin login for now); what evidence an admin needs to approve a claim (proposed: working website or social page naming the church, contact phone or email callback).

## Done checklist

AC1 to AC13 and controls ticked with proof [Fable]; permission matrix doc and tests agree; CI green; docs updated.
