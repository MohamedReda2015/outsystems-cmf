# Operations: deployment, upgrades, versioning, monitoring, testing

Rules: `COP-01` … `COP-10`. Builds on the architecture skill's `outsystems-architecture/references/lifecycle-and-sop.md` there (LifeTime, hotfixes, Definition of Done).

## Contents
1. Environments and versions
2. Deployment order
3. CMF upgrades
4. Changing processes and definitions with running cases
5. Monitoring
6. Diagnosis runbook ("the case is stuck")
7. Testing
8. ODC

## 1. Environments and versions (`COP-01`)
- The CMF app (and Common Shared Services) are at the **same version** in DEV, TST, UAT, PRD. Record the version in the project's AGENTS.md / blueprint.
- CMF is deployed by the platform team through LifeTime like any app; consumer apps tag the CMF version they were tested with.

## 2. Deployment order (`COP-02`)
1. Common Shared Services (if changed) → 2. CMF app (if changed) → 3. `<App>_CS` → `_BL` (bootstrap runs on publish) → `_CW` → `_Front_End`.
4. Check the bootstrap run log: Completed, definition Ready (`CheckApplicationStatus` / definition status), statuses visible through `CaseDefinition_GetStatusList`. A definition still Loading right after publish is normal; wait before smoke-testing (`CLL-19`).
5. Smoke test: create a case, act on the first activity, check status, inbox, timeline, notification (test override in non-PRD).
6. Environment data checklist: groups and members, calendars and holidays, SLA targets, notification templates, kill switches.
No deployments in business hours for apps with open SLAs unless the change is a hotfix (SLA timers keep running).

## 3. CMF upgrades (`COP-03`)
- An upgrade is its **own change request**, never bundled with feature work.
- Steps: read the release notes → diff the public API of the three `_API` modules against the project inventory → upgrade in DEV → refresh references in every consumer BL (`CaseManagement/_CmfAdapter` only should change) → run each consumer's regression suite → promote environment by environment.
- Never patch CMF modules to "fix" a bug; raise it, work around it in the adapter, document the workaround with the CMF version, remove it after the fixed version.

## 4. Changing processes and definitions with running cases (`COP-04`)
For each change, the spec records:
| Question | Options |
|---|---|
| What happens to **running** instances? | finish on the old version (default) · migrate to the new state · terminate and recreate |
| Which statuses / activities are deprecated? | deactivate, never delete (`CST-05`) |
| Data migration | a one-off timer, idempotent, batched, with run log and dry-run mode (`BAS-01`) |
| SLA impact | recompute due dates or keep the old ones |
| Rollback | how to go back if the migration fails halfway |
Test the migration on a **copy of production data** in a non-production environment before the release. Process-model changes follow outsystems-bpt `PVR-01`…`PVR-03` (count live instances per activity; add → drain → remove; test with in-flight instances).

## 5. Monitoring (`COP-05`)
| Signal | Where | Action |
|---|---|---|
| Activities open past SLA | inbox *Overdue* + daily report | escalate / reassign |
| Processes or activities in error | Service Center → Monitoring → Processes; error log | fix cause, retry/skip via Service Center, record in incident log |
| Mirror vs CMF status drift | reconciliation timer log | find the code path that bypassed the wrapper |
| Bootstrap failures | bootstrap run log | fix spec/GUID, rerun |
| Notification failures | outbox dead letters | fix recipient/template, retry |
| Delegations ending / users leaving with open tasks | weekly admin report | reassign |
| Closed cases with running processes | reconciliation | terminate process |
Kill switches for every case timer (bootstrap, reconciliation, SLA escalation, notifications) (`BAS-04`).

## 6. Diagnosis runbook ("the case is stuck") (`COP-06`)
1. Get the business record → `CaseId` → process instance id.
2. CMF: current status, open activities, assignees/groups, timeline (last event).
3. Service Center: process instance state; any activity in error; error log entries for the instance (correlation id).
4. Compare: mirrored status vs CMF status; status vs open activities (an `Approved` case with an open `ReviewRequest` = mixed mechanisms, `CST-04`).
5. Access: does the expected user have instance access, group membership, an active delegation?
6. Errors like **"Status is not valid for the status set"** → (a) the GUID is unique and belongs to this definition; (b) CMF actually has it: `CaseDefinition_GetStatusList` / `CaseDefinition_CheckValidStatus` — a record in your `CaseStatusConfiguration` alone is not enough, CMF validates its own `CaseStatus` data filled by the setup; (c) the bootstrap ran and the definition is Ready (not Loading/Error); (d) the move is a registered state-machine pair; (e) re-run the bootstrap timer and check its log (`CLL-01`, `CLL-18`, `CLL-19`).
7. Fix the cause in code/config; fix the case through a documented admin action (`system:` transition) in the process admin back office, with audit (`PEX-02`) — never with SQL on CMF or `OSSYS_BPM_*` tables (`PEX-04`).
For process-level triage (process status → activity status → error log → wait condition → assignment → inbox filter) use outsystems-bpt `outsystems-bpt/references/operations-and-versioning.md` there (§3).

### Protected modules (`COP-09`)
CMF modules are protected: you can't open them to debug. Diagnose through the public API (`CheckApplicationStatus`, `CaseDefinition_GetStatusList`, `Case_GetDetailsByCaseId`, `Case_GetHistory`), Service Center (process monitoring, error and general logs) and your adapter's logs (log CMF inputs/outputs with the correlation id, masked). Community answers that "fix" cases with UPDATE statements on CMF's internal tables are not supported: don't (`PEX-04`).

### Known CMF version issues (check against your installed version)
| Version | Fix / change | Impact |
|---|---|---|
| 1.5.1 | `Activity_GetActionList` returned no results (fixed); `CaseDefinition_GetProcessDefinitionId` could return the wrong id (fixed); access-control unique constraint blocked several records per definition (fixed); Oracle SLA overdue events didn't fire (fixed); static entities multilingual; new `Case_GetCasesByActivity(+Counters)`; **`Case_GetActivities` MyActivities semantics changed** | Below 1.5.1: don't build action bars or access control on these; re-test inbox tabs after upgrading |
| 1.5.2 | `Calendar_GetEndDate` null on non-working start date (fixed); wrong due dates from `Activity_CalculateAndSetDueDate` (fixed); delegation in group+user context (fixed); **fetch actions require a registered user** | Anonymous/external flows must change; re-test SLAs |
| 1.5.3 | `Case_GetActivitiesTimeline` ignored group assignments (fixed); Common Shared Services 1.11.0 | Upgrade CSS first |
| any | Community reports (2024): calendar due dates, SLA pause/resume, `Case_GetActivities` responses, reassignment events in history | Test these paths on your version |

### App Starter scaffolds (`COP-10`)
The Case Management App Starter creates `CMAppStarter_CS / _WF / _UI` with example records (`CaseDefinition_ExampleToCopyAndDelete`, `Open_…`, `Closed_…`), `Timer_SetupApplication`, `Request_Example`, `TicketProcess_Example`, `HumanActivity_Example`. Before the first feature: rename to the house names, regenerate every GUID, delete the example records, move `_UI` content into FE/CW, move CMF runtime calls into BL wrappers, remove Anonymous roles, then Manage Dependencies → Refresh All.

## 7. Testing (`COP-07`, `COP-08`)
- **Transition matrix** from the spec: every transition, every role, positive and negative (not allowed → rejected) (`COP-07`).
- Scenario tests (BDD) per path: happy path, return for info and resubmit, rejection, SLA breach and escalation, delegation, reassignment, two users acting on the same task, re-run bootstrap, closed-case read-only.
- Security tests from `references/security-and-access.md`.
- Performance: inbox with realistic volume (10⁵ cases, 10³ open tasks per group) under target response time.
- Regression suite runs on every CMF upgrade and every process change (`COP-08`).

## 8. ODC
CMF is an O11 framework built on BPT. On ODC there is no CMF: use ODC's workflow capabilities and keep this skill's **principles** — one wrapper over the workflow engine, one status truth, explicit transitions, server-side allowed actions, group assignment, SLA on the server, notifications after commit, versioned definitions with migration plans. Verify current ODC workflow features in the official ODC documentation before designing.
