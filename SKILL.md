---
name: outsystems-cmf
description: Design, configure, review and troubleshoot OutSystems 11 Case Management Framework applications. Covers installed API contracts, configuration, statuses, access, activities, commit boundaries, SLAs and upgrades. Includes a definition validator. Use when CMF is selected or already installed; do not assume every approval flow needs CMF.
license: MIT
metadata:
  version: 1.1.1
  updated: "2026-11-22"
  platform: OutSystems 11 (CMF Forge component 9179, v1.5.x; Reactive Web back office and portals). ODC notes only.
  agent-independent: "true"
  companion-skills: outsystems-architecture (layers, modules, rule IDs ARC/HSE/DAT/SEC/PERF); outsystems-backend-conventions (BL logic, transactions, async, rule IDs BLG/BTX/BAS/BER/BSC); outsystems-frontend-conventions (screens, blocks, client logic, rule IDs FET/CLG/ERR/BLK); outsystems-bpt (process design, activities, Light BPT); outsystems-live-style-guide (look)
---

# OutSystems CMF (Case Management Framework)

## Scope, evidence and consistency

- Run bundled scripts from the skill directory or use absolute paths; do not assume they exist in the application checkout.
- Establish O11/ODC, application type, installed component versions and the target environment from available evidence; ask only for information that changes the work.
- Separate **platform facts**, **house defaults**, **project decisions** and **observed lessons**. Project conventions choose among supported designs; they cannot change runtime behavior. The FE/CW/BL/CS chain is an O11 house pattern, not an ODC requirement.
- Preserve the user's requested scope and existing authorization. Continue routine reversible work; a skill does not authorize publishing, dependency changes or production operations beyond that scope. Do not introduce phase-by-phase approval unless the user or environment requires it.
- Prefer installed API signatures and version-matched official documentation. A repository development branch, community workaround or old project observation is evidence to investigate, not a release guarantee.
- Report evidence separately: **prepared → model validated → merged → published → runtime verified**. A static checker passing proves only its covered checks on the supplied inventory. Unknown, blocked and not tested remain explicit.
- Read [verification and reliability](references/verification-and-reliability.md) when changing data contracts, concurrent operations, runtime behavior or verification. It contains the concrete acceptance checks and sources for this skill.


This skill makes an agent build case-management apps on the OutSystems **Case Management Framework (CMF)** the way a senior OutSystems architect expects them in review:
- **CMF only when it earns its place**, consumed as a framework and never edited, through one BL wrapper;
- **case definitions are versioned configuration**: static entities with GUIDs, a verified bootstrap, deployed like code;
- **status changes are explicit**: CMF validates them, it never makes them; the app passes the target status;
- **commit-capable framework actions are explicit boundaries**: validate and write before close, assignment or discard calls that commit;
- **access is checked twice on the server**: CMF access control *and* the house role + ownership check;
- **SLAs, delegation, history and retention come from CMF first**, tested on the installed version;
- **upgrades and live changes are planned**: running instances, GUIDs and status sets never break.

It works for any agent (Claude, Copilot, Cursor, Codex, Gemini, a custom LLM agent) and for humans. Everything is plain Markdown plus zero-dependency Node.js scripts.

## Where this skill sits

| Question | Skill |
|---|---|
| Which module and layer, who may reference whom, app composition, LifeTime SOPs | **outsystems-architecture** |
| How BL logic, transactions, timers, integrations and server security are written | **outsystems-backend-conventions** |
| How processes, human/automatic activities, Light BPT and process versions are designed | **outsystems-bpt** |
| How screens, blocks, data fetching, forms and client logic are written | **outsystems-frontend-conventions** |
| How it looks | **outsystems-live-style-guide** |
| How **CMF** is chosen, placed, wrapped, configured, secured, operated and upgraded | **this skill** |

When they overlap, the owner above wins, with these **deliberate CMF specializations of outsystems-bpt**:

| outsystems-bpt default | In a CMF app |
|---|---|
| `PAR-03` business entity status is the truth for UI and reports | UI and reports read the **status mirror** on the business entity; the mirror is written only by the BL wrapper, committed with the CMF status change (`CST-01`). |
| `PHA-03` mirror human activities in an `<App>Task` entity | CMF activities, assignments, delegations and SLAs **are** the task store; no `<App>Task` duplicate (`CUI-09`). |
| `PHA-05` claim, `PHA-01` checked completion | CMF pickup / close calls **inside** BL wrappers with the same server checks (`CAC-02`, `CAC-11`, `CSC-01`…`CSC-03`). |
| `PAR-04` explicit launch, `PVR-01` live-instance safety, `PEX-04` no system-table fixes | Unchanged, also for CMF configuration and CMF internal tables (`CST-05`, `COP-04`, `COP-09`). |

This skill cites their rule IDs and adds its own: `CAR` architecture, `CDF` definitions, `CST` statuses, `CAC` activities, `CSC` security, `CSL` SLA/delegation/notifications/retention, `CUI` UI, `COP` operations, `CLL` lessons.

## Applying conventions

Use the project's documented architecture, naming and design choices where supported. Use this skill's house defaults when the project has no decision. Official documentation and installed contracts determine platform behavior; house preferences never override those facts. Record a consequential deviation and its reason. Escalate unresolved security, data-integrity or compatibility conflicts, not ordinary naming or layout choices.

## Facts about CMF (from official docs, release notes and staff/MVP answers)
- OutSystems-supported Forge component for **O11** (9179, **1.5.3 reviewed baseline; verify the installed and current supported release**, Platform Server Oct 2019+), built on **BPT**, depends on Common Shared Services. Modules are **protected** (can't be opened). **Not on ODC.**
- Public API: `CaseServices_API` (run time), `CaseConfigurations_API` (design time), `CaseProcessConfigurations_API` (process config, SLAs). Catalogue with verification marks: `references/cmf-api-map.md`.
- Official app shape: `<Entity>_CS` with the business entity whose **Id is a Case Identifier**, static entities `CaseDefinitionConfiguration` and `CaseStatusConfiguration` (GUID ids, one `IsInitial`), a **"When Published" bootstrap timer** calling `SetupCaseManagementApplication(SetupData)`; `<App>_WF` processes calling `Case_AssociateProcess` and ending with `Case_Complete`. **One case definition per CS module.**
- CMF validates statuses against its **own** registered data, not your static entity: "Status is not valid for the status set" usually means the status never reached CMF, belongs to another definition, has a duplicated GUID, or the pair isn't in the state machine.
- **CMF never changes status by itself.** `Case_CloseActivity` updates it only when you pass Status; `Case_UpdateStatus` validates against the state machine.
- The reviewed API documents commits in `Case_CloseActivity`, `Activity_AssignToGroup` and `Case_DiscardActivity`. Verify every called action against the installed version. `Case_CloseActivityAsync` requests later closure; record pending state and reconciliation rather than reporting immediate completion.
- Access control: Read/Write, enforced only when the definition has `HasAccessControl`; highest of definition and instance grants wins; single-case actions raise, list actions silently filter; since 1.5.2 fetch actions require a registered user.
- Version-specific bugs and changes (1.5.1–1.5.3): `references/operations-and-deployment.md` §6.

## Step 0: establish context (before writing anything)
1. **Is CMF the right tool?** (`CAR-09`, `references/architecture-and-modules.md` §1). If not: status lifecycle or plain BPT.
2. **Versions**: Platform Server; CMF version in every environment (same everywhere, `COP-01`); Common Shared Services.
3. **Inventory the installed CMF API**: list the public actions, structures and static entities of the three `_API` modules; every action you call must come from it (`CAR-03`). Start from `references/cmf-api-map.md`.
4. **What exists**: definitions and GUIDs, status sets, state-machine pairs, groups, calendars, SLAs, processes, App Starter leftovers (`COP-10`), the BL wrapper folder, case blocks. **Reuse before creating.**
5. **The business concept** per case type, its module chain and who works it (groups).
6. **Write the definition spec first** (`templates/case-definition-spec.md`) and validate it (below).

## The CMF app on the 3-layer Canvas

```
END-USER    <App>_Front_End     Inbox, case detail, activity screens, routing table, admin screens. CW only.
──────────────────────────────────────────────────────────────────────────────────────────────────
CORE        <App>_CW            CaseInbox, CaseHeader, CaseActionBar, CaseTimeline, CaseNotes. Data → BL.
            <Concept>_BPT/_WF   (optional) processes above BL; CMF calls still through BL wrappers.
            <App>_BL  ◄── the only door to CMF (house default)
                                CaseManagement/: use-case wrappers, _CmfAdapter, Bootstrap (When Published
                                timer → SetupCaseManagementApplication), Case_Initialize in the create use
                                case, status mirror, access checks; Processes; case Structures.
            <App>_CS            Business entity (Id = Case Identifier, StatusId mirror), CaseDefinition-
                                Configuration, CaseStatusConfiguration (+ action/activity keys), CRUD.
                                One case definition per CS module.
            CMF app (as shipped) CaseServices_API · CaseConfigurations_API · CaseProcessConfigurations_API
                                + protected CM_* modules. Own lifecycle. NEVER edited.
──────────────────────────────────────────────────────────────────────────────────────────────────
FOUNDATION  Common Shared Services, <Name>_Lib (notifications, audit), <Concept>_IS (external systems)
```
- Only BL references CMF API modules (`CAR-04`); CW/FE never (`HSE-03`). The official tutorial puts `Case_Initialize` and the bootstrap in CS: accepted as a **documented variant** for existing apps (`CAR-08`), runtime calls still in BL.
- Apps never share definitions; cross-app subcases via Service Actions (`CAR-07`).

Details: `references/architecture-and-modules.md`.

## Core conventions (details in the references)

### 1. Wrap CMF behind house actions (`CAR-*`)
- One public BL action per business use case (`Request_Submit`, `Request_Approve`, `Request_TakeTask`, `RequestCase_GetInbox`): **authorize → validate → business writes + mirror → CMF call last → map to a BL Structure** (`BLG-01`, `CAC-09`).
- CMF structures never leave BL; CMF exceptions are mapped to house exceptions (`CAR-05`, `BER-01`). All CMF calls live in `CaseManagement/_CmfAdapter` (`CAR-06`).

### 2. Case definitions are configuration as code (`references/case-definition-and-configuration.md`)
- `CaseDefinitionConfiguration` / `CaseStatusConfiguration` records with **GUIDs** generated once, never changed, reused or copied (`CDF-01`, `CDF-02`); Name/Alias ≤ 50, Description ≤ 200 (`CDF-10`).
- A "When Published" bootstrap builds complete `SetupData` (entity espace id, definition, statuses, state-machine pairs, actions, templates, milestones), calls the non-deprecated setup action, then **verifies** what CMF registered and waits for Ready (`CDF-03`, `CDF-04`, `CDF-09`).
- Translations via `TranslationList` (`CDF-06`); purge settings explicit (`CSL-09`); environment data (members, calendars) maintained by admins (`CDF-05`).
- Validate the spec before building:
  ```
  node scripts/check_case_definition.mjs <definition.json> [--json]
  ```

### 3. Explicit, validated status changes (`references/lifecycle-status-and-activities.md`)
- Register every spec transition as a CMF state-machine pair (`CST-09`); CMF then rejects anything else.
- The wrapper **passes the target status** from the spec: `Case_CloseActivity(…, Status)` for user decisions, `Case_UpdateStatus` for `system:` transitions — one mechanism per transition (`CST-04`, `CST-08`).
- The entity `StatusId` mirror is written only by the wrapper, before the close, so both commit together (`CST-01`). A reconciliation timer reports drift.
- Never delete or reuse used statuses: `IsActive = False` (`CST-05`). Closed cases are read-only (`CST-07`).

### 4. Activities: groups in, actions out, close last (`CAC-*`)
- Assign to groups (`Activity_AssignToGroup`) (`CAC-01`); collaboration (pickup, takeover, release, block, skip, reassign) through BL wrappers over the CMF actions (`CAC-11`).
- Allowed actions = spec ∩ CMF ∩ house role, re-checked on submit (`CAC-02`, `CSC-03`); rejecting actions require a comment (`CAC-06`).
- **`Case_CloseActivity` commits**: validate and write everything first, close as the last step, or use `Case_CloseActivityAsync` deliberately (`CAC-09`).
- No Destination screens from Core processes; FE routing table (`CAC-03`). Create the case and launch the process explicitly in BL, then `Case_AssociateProcess`; end with `Case_Complete` (`PAR-04`, `CAC-10`).

### 5. Security: CMF access control plus house checks (`references/security-and-access.md`)
- Restricted definitions: `HasAccessControl = True`, minimal definition-level grants, per-case grants at instance level, the right action per level (`CSC-09`).
- Every wrapper: role + CMF access (`Activity_ValidateUserAccess`, single-case reads) + ownership; reload ids, check active and not blocked (`CSC-01`, `CSC-02`).
- Map CMF permission exceptions; treat silently filtered lists as "nothing visible"; no CMF reads for anonymous users (`CSC-10`). Identity from `GetUserId()` (`SEC-09`).

### 6. SLAs, delegation, notifications, history, retention (`references/sla-delegation-notifications.md`)
- CMF SLAs with calendars, due dates on the server, escalation for every SLA; **test due dates with real calendars** on your version (`CSL-01`, `CSL-05`, `CSL-10`).
- CMF delegation (`CSL-02`); notifications after commit (`CSL-03`); CMF history + Audit_Lib, no third history (`CSL-04`); purge settings aligned with retention (`CSL-09`).

### 7. UI (`references/ui-patterns.md`)
- Inbox tabs from CMF list semantics (`ActivityAssignementStatusId`, counters in one call), server-side paging (`CUI-01`, `CUI-09`); detail tabs on demand (`CUI-02`); action bar from server options with a double-submit guard (`CUI-03`); conflicts ("taken by", "blocked") explained (`CUI-05`).

### 8. Operations (`references/operations-and-deployment.md`)
- Deploy order, bootstrap Ready check, smoke test (`COP-02`); CMF upgrades as separate changes with API diff and regression (`COP-03`); running-instance plans (`COP-04`); monitoring (`COP-05`); diagnosis via public API and logs, never SQL on protected CMF tables (`COP-06`, `COP-09`); App Starter cleanup (`COP-10`).

## How to work

### Building a CMF case type
1. Step 0. Fill the spec, export JSON (`scripts/examples/good-definition.json`), run the validator until clean.
2. Folders first (CS `Lookups/CaseConfiguration`; BL `CaseManagement/<Concept>`, `_CmfAdapter`, `Bootstrap`, `Processes`; CW `Blocks/Case`; FE `Cases`).
3. Bottom-up: CS entity (Id = Case Identifier, `StatusId`) + config static entities → BL bootstrap and verify → BL wrappers (create, actions, collaboration, reads) → process (outsystems-bpt) with `Case_AssociateProcess` and `Case_Complete` → CW blocks → FE inbox, detail, routing table.
4. Name every element as you create it (`references/architecture-and-modules.md` §6).
5. Wire security, transaction order, mirror, SLA, notifications and timeline **before** calling it done.
6. **Verify on the platform** (`BLL-01`, `CLL-07`): publish when authorized, wait for Ready, run the bootstrap twice, create a case, walk every spec transition, try a transition not in the state machine, an action not allowed, another user's case, a blocked task, a delegated task, an SLA on a holiday, a double submit. Report what you saw.
7. Finish with the architecture skill's `build-report.md` in the architecture skill’s templates directory when installed; otherwise report the evidence stages and remaining work from this skill’s templates.

### Reviewing
1. Step 0; run the validator on the definition (export it from the static entities if no spec exists).
2. Walk `references/review-checklist.md`. Triage: Security → Status integrity → Architecture → Performance → Maintainability.
3. Write `templates/cmf-review-report.md`: most severe first, rule ID, evidence (`Module.Folder.Element` or GUID), concrete fix.

### Troubleshooting ("the case is stuck", "status not valid")
`references/lessons-learned.md`, then the runbook in `references/operations-and-deployment.md` §6.

## Rules most often broken
- FE/CW calling `CaseServices_API`; CMF structures bound to screens (`CAR-04`, `CAR-05`).
- Expecting the state machine to move the status; closing activities without a Status (`CST-08`).
- Writes placed after `Case_CloseActivity`, which already committed (`CAC-09`).
- Status added to the static entity but never registered in CMF → "Status is not valid for the status set" (`CDF-03`, `CLL-18`).
- GUIDs regenerated, copied or reused (`CDF-02`).
- `HasAccessControl` off on restricted cases, or definition-level Write that no instance change can lower (`CSC-09`).
- Approve/Reject shown by status and not re-checked on the server (`CAC-02`, `CSC-03`).
- Process launched on Create of the business entity (tutorial pattern) and imports launching thousands (`PAR-04`).
- Inbox tabs built on *MyActivities* without assignment filters (`CUI-09`).
- Due dates never tested with holidays; next year's calendar not loaded (`CSL-10`, `CLL-13`).
- CMF "fixed" with SQL on its internal tables (`COP-09`).

## Reference map (read only what the task needs)
| File | Read when |
|---|---|
| `references/architecture-and-modules.md` | choosing CMF, placing modules, official tutorial mapping, wrapper, naming, folders |
| `references/cmf-api-map.md` | which CMF action does what, permissions per action, setup structures (verify in inventory) |
| `references/case-definition-and-configuration.md` | definitions, static entities, GUIDs, bootstrap, groups, calendars, multilingual, purge, changes |
| `references/lifecycle-status-and-activities.md` | state machine, status changes, close-activity transactions, activities, collaboration, actions, rules, subcases |
| `references/security-and-access.md` | any wrapper, inbox query, action submit, access grants, documents |
| `references/sla-delegation-notifications.md` | SLAs, calendars, escalation, delegation, notifications, history, retention |
| `references/ui-patterns.md` | inbox, case detail, action bar, timeline, admin screens |
| `references/operations-and-deployment.md` | deployment, upgrades, version bugs, App Starter, migration, monitoring, runbook, testing, ODC |
| `references/lessons-learned.md` | before any build, upgrade or troubleshooting (`CLL-*`) |
| `references/review-checklist.md` | any review, audit or "is this right?" question |
| `templates/case-definition-spec.md` · `templates/cmf-review-report.md` | new or changed case type; review report |
| `scripts/check_case_definition.mjs` | validating a definition JSON (`--json`) |
| `research/sources.md` · `research/assessment-2026-11.md` | where a fact comes from; what changed and why; what is unverified |

For requirement-to-runtime handoffs, also use the cross-skill acceptance section in [verification and reliability](references/verification-and-reliability.md); preserve source/story/criterion IDs and the tested application version.
