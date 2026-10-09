# Ideas

Documents in `docs/ideas` describe possible future capabilities.

They are NOT current implementation requirements.

Claude must NOT implement an idea merely because it exists in `docs/ideas`.

Implementation requires an explicit issue/task authorizing the work.

## Rules vs ideas

* `/docs/automation` and the other `/docs` files: rules to follow now.
* `docs/ideas`: options to evaluate later. Vendor-neutral; no vendor, tool, or architecture is selected by being mentioned here.

When an idea is authorized and implemented, move the resulting decisions into the appropriate rules document (for example `/docs/testing.md`, `/docs/automation`, `/docs/deployment.md`) and update or remove the idea.

## Index

* `product-analytics.md`
* `heatmaps-and-session-replay.md`
* `automation-prioritization.md`
* `observability.md`

## Independent review (2026-10-09): recommendations, pending the owner

An independent review recommended the following. These are **recommendations awaiting the owner's yes or no**, not decisions; none authorizes implementation.

| Idea | Recommendation | Condition |
| --- | --- | --- |
| `observability.md` | Adopt the cheap half now: error tracking and structured logs with redaction (traces and performance later) | The owner approves the vendor (a free tier is still a vendor choice); log redaction proven by a break-it test |
| `product-analytics.md` | Adopt at the launch gate, privately: first-party counts per workflow per day written by the API, no user ids, no analytics SDK on phones | Retention schedule and privacy notice exist first; events are added to the data inventory |
| `heatmaps-and-session-replay.md` | Reject for signed-in screens (they would record prayer requests and which church someone attends). At most on public marketing pages, with consent, at a trigger, never on mobile | Keep the low-usage human-review principle; use moderated usability sessions with real church members instead |
| `automation-prioritization.md` | Adopt at a trigger: analytics exists, at least five features shipped, coverage reports produced. Until then a short manual quarterly table | Usage data may never justify deleting security, authorization or payment tests |
