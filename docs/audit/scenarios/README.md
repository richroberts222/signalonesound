# Pass 3 scenarios

Fourteen scenarios from `methodology.md` Appendix B, walked against the baseline on 2026-10-08. Each file lists the walk, where it breaks (with finding IDs), and anything new.

| Scenario | Result |
| --- | --- |
| S-01 Years of operation | Covered by existing findings |
| S-02 One million users | Covered; correctly deferred |
| S-03 Stale mobile clients | Covered; trigger-gated |
| S-04 External attacker | Covered; F-TEST-001 and F-AUTH-001 are the cheap, proven priorities |
| S-05 Privileged insider | Covered; shared login is accepted residual risk |
| S-06 Compromised dependency or Action | Covered; detail added to F-SEC-004 |
| S-07 Prompt injection | Covered; F-SEC-002 is the High |
| S-08 Vendor outage | Covered; detail added to F-OPS-004 |
| S-09 Bad migration or corruption | Covered; restore drill is the top item |
| S-10 Credential loss | Covered; owner actions |
| S-11 Audit or legal request | Covered; before real data |
| S-12 Traffic or cost spike | Covered |
| S-13 Recovery by a stranger | Covered; argues for the cheap documentation items |
| S-14 New app from the boilerplate | Covered; partly fixed |

**Outcome:** no scenario exposed a gap that no subject owns. Two detail lines were added to existing findings (F-SEC-004, F-OPS-004). That is consistent with Pass 2 having used the charter's lenses in every subject, and it is the first data point for the convergence test; Pass 4 must still try to disprove it from a fresh session.
