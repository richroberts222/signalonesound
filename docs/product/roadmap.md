# Signal One Sound Roadmap

The roadmap records the sequencing of approved feature slices. It derives from `/docs/product/product-plan.md` (direction) and Rich's decisions. It does not authorize implementation; each slice requires its own approved issue. Source requirements in `/docs/product/source-product-plan.md` are historical and are not rewritten here.

## Delivered baseline

* `signal-one-foundation-v1`: immutable foundation baseline tag (see `/docs/git-workflow.md`). Foundation only; no domain features.
* The Issue #57 fire/gold home UI concept was merged (PR #58) and then reverted (PR #59). It is not part of the baseline and does not define requirements.

## Slices

All slices so far are mock-first: static data, no product schema, no persistence, no product API. Confirm exact status in GitHub.

| Slice / issue | Feature spec | Status |
| --- | --- | --- |
| Discover Revival mock (find events by distance, date, Revival Type) | none yet | Delivered |
| Global App Shell and header navigation (Issue #68, PR #69) | none yet | Delivered |
| Church/Ministry event management mock (Issue #70, PR #73) | none yet | Delivered |
| Member account and notification preferences mock (Issue #74, PR #75) | none yet | Delivered |
| Admin / Content Management mock (Issue #76): admin overview, Church/Ministry and event management, submission moderation queue, bulk CSV import (all mock) | none yet | Delivered (Issue #76, PR #77) |

## Not yet scheduled

Raised by Rich for a later Data Requirements Review; not approved and not designed: final member/admin/moderator roles and authorization, Church/Ministry-managed data, a real community submission flow (the Issue #76 moderation queue is a mock of review only), real admin entry, real bulk CSV/spreadsheet ingestion, multiple authorized users per organization, and the product schema. Clerk stays the identity provider; application roles, ownership, and profile data are product-domain concerns. The Issue #76 admin mock does not grant or imply real admin authority.

### Data concepts surfaced by the Issue #76 mock (inputs to the Data Requirements Review; not a schema)

* Source/provenance of an event and of an organization record (Church/Ministry-managed, community submission, admin entry, bulk import), plus who or what created it.
* Moderation status and decisions (pending, approved, rejected), reviewer, reason, and whether edits made before approval are kept separately from the original submission.
* Duplicate and conflict detection and resolution (within a file and against existing events), including what counts as a match.
* Organization-manager relationships: several managers per organization, pending invitations, organizations with no manager, and who may edit staff-entered records.
* Import batches and rows: per-row validation errors, per-row resolution choice, batch-level result, and links from created records back to their batch and row.
* Organization and event lifecycle states (for example unverified, paused, hidden, pending review) and what each means for Discover visibility.
* Audit/history of who changed what and when, across all of the above.
* Events not tied to any organization (for example some community submissions).

Claude may recommend a next slice in the issue/PR conversation but must not start it without authorization.

## Proposed full-application plan (draft)

A draft blueprint of the whole application and its delivery slices (S0 to S9 for the Phase 1 minimum scope, then later waves) is in `/docs/product/blueprint.md`. It is a proposal for the owner's approval and an independent review; it does not approve or schedule any slice. Each slice still needs its own approved issue and specification.
