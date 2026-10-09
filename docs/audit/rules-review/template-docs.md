# Rules review 12: template documents, `notes.md`, feature specifications README

Covers `docs/boilerplate.md`, `docs/new-app-setup.md`, `docs/customization-map.md`, `docs/notes.md`, `docs/features/README.md`. Reviewed 2026-10-09 with the owner's five tests: **Sense**, **Standard**, **Solid**, **Enforced**, **Proven**. Standards named from recollection (not re-fetched): twelve-factor (config and parity), template-repository practice, requirements traceability.

## Overall verdict

The template documents are **sensible and accurate** apart from one false claim and one stale file. Their rules are mostly **enforced and proven by the template tooling tests**: the identity rewrite, the leak detector, the export, and the tracked-files copy were all broken on purpose in earlier work (name rewrite, tracked files, markers, secrets, proof leftovers). The feature-specification README lacked the owner's completeness requirements and now has them.

## Rule-by-rule

| Document and rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| `boilerplate.md`: init removes proof artifacts, rewrites identity, produces a clean application and refuses to run twice | Template repository practice | `boilerplate.test.mjs` (8 tests) | **Yes**: the full-name rewrite fails its test when removed; tracked-files copy fails when it walks the folder; secret detection and local-env skip have their own tests |
| `boilerplate.md`: the leak detector flags identity, proof references, placeholder store ids, credential-shaped content | Secret scanning | `check-boilerplate.mjs`, run by init and the export test | Yes (each rule has a negative control) |
| `boilerplate.md`: markers (`proof`, `template`, `reference`) strip prose | Docs-as-code | `stripMarkedRegions` test | Yes. Used this review to keep product-specific text out of generated apps |
| `boilerplate.md`: the product features (admin, church, discover, member) are removed from a generated app | Template hygiene | **Not enforced** | **Gap** (independent audit B1: 68 product files are not in the strip list). Tracked in the plan |
| `new-app-setup.md`: the ordered human steps for Clerk, Neon, Vercel, Expo | Runbook | Procedural | Guidance. Section numbering skips 7 (Low) |
| `customization-map.md`: every identity location and whether it is automatic, manual, secret or environment-specific | Runbook | `check-boilerplate` catches leftovers | Yes for the automatic rows |
| `notes.md`: optional, only non-discoverable information, overwritten not appended, no secrets | Docs hygiene | Secrets guard; init resets it to a stub | Secrets guard proven; the rest is guidance |
| `features/README.md`: every meaningful feature has a spec; unresolved items marked UNDECIDED | Requirements practice | Procedural | **Strengthened** below |

## Fixed in this pull request

| Defect | Where | Fix |
| --- | --- | --- |
| False claim that `deployment.md` still describes validation as planned although `ci.yml` exists | `boilerplate.md` Known gaps | Replaced with an accurate list of open gaps |
| The published template repository is described as private; the owner has accepted it staying public | `boilerplate.md` | States the decision and its revisit trigger |
| `docs/notes.md` still held the closed Issue 76 notes ("do not merge before review", open questions the owner has since answered) | `notes.md` | Reset to the stub that init produces, per the file's own rule (overwrite, never append) |
| Neon setup suggested one branch per environment with no warning about children inheriting production data | `new-app-setup.md` | Create children from an empty baseline; points to `database.md` section 13 |
| Feature specifications had no stop line | `features/README.md` | Every spec states numbered acceptance criteria, a controls inventory, a scope fence and a done checklist, tied to `acceptance.md` and the definition of done |

## Open items (tracked elsewhere)

* Strip the leaked product features from the export: independent audit B1 (medium).
* `new-app-setup.md` numbering (Low).
* The three section numbering references elsewhere (`new-app-setup.md` section 9) are unaffected.

## Owner decisions

None for these documents.
