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
| Member account and notification preferences mock (Issue #74) | none yet | Approved; in review (not merged) |

## Not yet scheduled

Raised by Rich for a later Data Requirements Review; not approved and not designed: member/admin/moderator roles, Church/Ministry-managed data, community event submissions (possibly moderated), admin entry, bulk CSV/spreadsheet import, and multiple authorized users per organization. Clerk stays the identity provider; application roles, ownership, and profile data are product-domain concerns.

Claude may recommend a next slice in the issue/PR conversation but must not start it without authorization.
