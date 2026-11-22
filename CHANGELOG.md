# Changelog

## Unreleased — cross-skill delivery review (2026-11-22)

- Connected requirements, domain implementation and runtime evidence through stable IDs and versioned handoffs.
- Added domain acceptance guidance, template evidence fields and sourced review checks.


## Unreleased — reliability review (2026-11-22)

- Clarified platform facts versus house/project conventions and verification evidence.
- Added domain-specific reliability guidance, source provenance and acceptance cases.
- Added review/template checks and corrected over-broad or inconsistent claims.
- Extended repository consistency checks to the new reliability rule IDs and aligned contributor guidance with the full checkout.


## 1.1.1 — 2026-11-22
Prepared for public release on GitHub (no rule changes).
- Repository files: README for public use, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, THIRD_PARTY_NOTICES, issue and PR templates.
- Release zip `outsystems-cmf-vX.Y.Z.zip` built with `git archive` (repository plumbing excluded) and attached to the GitHub release.
- Adapters: GitHub Copilot, Cursor rule, chat-assistant instructions; core-rules block kept identical to `adapters/AGENTS.md` (checked).
- `check_skill.mjs`: adapter sync, required public files, example GUID uniqueness.
- `.gitattributes` keeps repository plumbing out of the packaged skill; `.gitignore` excludes local inventories.
- Neutral example names only.

## 1.1.0 — 2026-11-22
Research pass over official CMF docs, Forge release notes and staff/MVP forum answers (`research/assessment-2026-11.md`).
- **Corrected**: CMF never moves status by itself — the wrapper passes the target status (`CST-08`); `Case_CloseActivity` commits the transaction — close last (`CAC-09`); CMF validates its own registered statuses, not your static entity (`CLL-18`); business entity Id is a Case Identifier (`CAR-10`); access control is per definition and instance with highest-wins (`CSC-09`).
- **Added**: `references/cmf-api-map.md` (actions, permissions, setup structures, verification marks); choosing CMF (`CAR-09`); official tutorial / App Starter mapping (`CAR-08`, `COP-10`); official bootstrap with `SetupData` and Ready check (`CDF-09`); length limits and one definition per module (`CDF-10`, `CDF-11`); state-machine pairs (`CST-09`); `Case_Complete` (`CAC-10`); activity collaboration wrappers (`CAC-11`); CMF permission semantics (`CSC-10`); purge/retention (`CSL-09`); calendar due-date testing (`CSL-10`); inbox list semantics (`CUI-09`); protected modules (`COP-09`); version-bug table; lessons `CLL-18`…`CLL-27`.
- **Validator**: CMF length limits, inactive statuses/transitions, explicit `hasAccessControl` and purge settings, one definition per module; examples and regression test updated.
- Sources rewritten with confidence levels.

## 1.0.0 — 2026-11-22
- First release of the OutSystems CMF (Case Management Framework) skill for O11.
- CMF placed on the 3-layer Canvas and the house Front_End → CW → BL → CS chain, with a BL anti-corruption wrapper (`CAR-*`).
- Case definitions as configuration as code: static entities, stable GUIDs, idempotent bootstrap, environment data, multilingual labels, change rules (`CDF-*`).
- State machine, status mirror, transition mechanisms, activities, actions, rules, subcases, milestones (`CST-*`, `CAC-*`).
- Security (`CSC-*`), SLAs/delegation/notifications/audit (`CSL-*`), UI patterns (`CUI-*`), operations, upgrades, versioning, diagnosis runbook, testing, ODC note (`COP-*`).
- Explicit specializations of outsystems-bpt (`PAR-03`, `PHA-03`) for CMF apps.
- 17 lessons (`CLL-*`), marked public vs project.
- `scripts/check_case_definition.mjs` validator with good/bad examples and a regression test; `scripts/check_skill.mjs` consistency checker.
- Templates: case-definition spec, CMF review report. Adapter: AGENTS.md core rules.
