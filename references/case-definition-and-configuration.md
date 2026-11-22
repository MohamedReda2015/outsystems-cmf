# Case definitions and configuration

Rules: `CDF-01` … `CDF-11`. API names: `references/cmf-api-map.md` (verify in your inventory).

## Contents
1. What a case definition contains
2. Configuration as code: static entities and GUIDs
3. The bootstrap (official setup)
4. Groups, calendars and environment-specific data
5. Multilingual labels
6. Purge and retention
7. Changing a definition after go-live
8. The definition spec and the validator

## 1. What a case definition contains
| Part | Content | Lands in CMF via |
|---|---|---|
| Definition | GUID, Name (≤ 50), Description (≤ 200), `HasAccessControl`, purge settings, translations | `SetupData.CaseDefinition` |
| Statuses | GUID, Name (≤ 50), Alias (≤ 50), `IsInitial` (exactly one), `IsActive`, translations | `SetupData.CaseStatusList` |
| State machine | allowed From → To pairs | `SetupData.CaseStateMachineList` |
| Workflow actions | action keys/labels | `SetupData.CaseActionList` / `CaseAction_Bootstrap` |
| Activities | human/automatic, group, SLA, allowed actions, target status per action | your process + spec + BL (CMF stores pairs only) |
| Rules | logical, group, user, status conditions | rules engine API |
| SLAs, calendars | targets, calendars, holidays, escalation | `CaseProcessConfigurations_API`, calendar API |
| Email templates, milestones | templates with placeholders, milestone definitions | `SetupData.EmailTemplateList`, `MilestoneDefinitionList` |
| Groups | business groups and membership | group API / admin screens |
CMF's state machine stores **pairs only**. Which action, condition and role triggers a pair is house design: it lives in the spec and in BL (`CST-08`).

## 2. Configuration as code: static entities and GUIDs (`CDF-01`, `CDF-02`, `CDF-11`)
- Follow the official shape: `CaseDefinitionConfiguration` (Id renamed `CaseDefinitionId`, Text; Name, Description, HasAccessControl, PurgeTypeId, DaysToPurgeCase, DaysToPurgeProcess) and `CaseStatusConfiguration` (Id renamed `CaseStatusId`, Text; Name, Alias, IsInitial, IsActive), both in the CS module, Public.
- Record identifiers **are GUIDs** generated once with a real generator (RFC 4122), never changed, reused or copied between definitions (`CDF-02`). Code passes them with `TextToIdentifier(Entities.CaseDefinitionConfiguration.CaseDefinition)`.
- **One case definition per CS module** (official guidance) (`CDF-11`). Two case types → two concept CS modules.
- Never delete a deployed status record: set `IsActive = False` (`CST-05`).
- Important: these static entities are **your source**, not what CMF validates. CMF validates against its own `CaseStatus` data, filled by the setup action. A record that exists only in the static entity produces "Status is not valid for the status set" (`CLL-18`).

## 3. The bootstrap (official setup) (`CDF-03`, `CDF-04`, `CDF-09`)
```
Timer_RequestCaseBootstrap (schedule: When Published)   → RequestCase_Bootstrap (BL/CaseManagement/Bootstrap)
  0. Kill switch: Site.RequestCaseBootstrapIsEnabled; run log row (Started, spec version)
  1. Aggregates on CaseDefinitionConfiguration and CaseStatusConfiguration (+ actions, state machine source)
  2. Build SetupData:
       BusinessEntityEspaceId = GetOwnerEspaceId() of the module that owns the business entity
       CaseDefinition, CaseStatusList, CaseStateMachineList, CaseActionList,
       EmailTemplateList, MilestoneDefinitionList
  3. SetupCaseManagementApplication(SetupData)            ← not DEPRECATED_SetupCaseManagementApplication
     (or BootstrapCaseConfiguration / CaseStatus_Bootstrap / CaseAction_Bootstrap per your inventory)
  4. Verify: CaseDefinition_GetStatusList / CaseDefinition_CheckValidStatus for every active status;
     CheckApplicationStatus; compare to the static entities
  5. Run log: Completed | Pending (setup still Loading) | Failed (first mismatch)
```
- **Idempotent**: run twice, nothing changes (`CDF-03`, `BAS-03`). Note that a setup that finds existing configuration may skip work: changes to statuses must actually reach CMF — verify (step 4), don't assume (`CLL-18`).
- The setup is partly **asynchronous**: the definition goes Loading → Ready (or Error). Don't create cases or run follow-up configuration until it is Ready; a run that ends while Loading logs `Pending` and the verify step re-runs (`CLL-19`).
- If `BusinessEntityEspaceId` points to the wrong module, CMF can't link entity events and processes: set it from the module that owns the entity (house default puts the bootstrap in BL, so pass the CS module's espace id via a public CS action returning `GetOwnerEspaceId()`).
- Never called from a user request; can be woken from the admin screen.

## 4. Groups, calendars and environment-specific data (`CDF-05`)
| Data | Where | Who |
|---|---|---|
| Group **keys** | static entity + bootstrap | developers |
| Group **membership** | `Group_AssignGroupToUser` from admin screens, or `UserHierarchy_Import` / IdP sync | admins per environment |
| Calendars, holidays, non-working days | `Calendar_*`, `Holiday_*`, `NonWorkingDay_*` via admin screen or seed timer | admins |
| SLA targets that differ per environment | process/SLA configuration admin | admins |
| Email template text | `EmailTemplate_*` admin | admins |
- Seed timers for test users/groups have a kill switch that is off in production (`CLL-16`).
- Groups map to OutSystems roles in one BL action (`CSC-05`).

## 5. Multilingual labels (`CDF-06`)
- CMF 1.5.1+ makes its static entities multilingual (English, Arabic, Dutch, German, Italian, Japanese, Portuguese, Spanish). Pass translations through `TranslationList` in `Setup_CaseDefinition` / `Setup_CaseStatus`.
- Screens show labels from the server; never `If(StatusId = …, "Approved", …)` literals. Test inbox and timeline in RTL.

## 6. Purge and retention (`CSL-09`)
- Set `PurgeTypeId`, `DaysToPurgeCase` and `DaysToPurgeProcess` **explicitly** in the definition: `< 0` never purge, `0` system default (`GetSystemDefaultDaysToPurge`), `> 0` days.
- Align with the legal retention of the business record and with outsystems-bpt data-growth rules (`POP-01`). History you must keep longer than CMF data goes to your own entities/archive before purge.

## 7. Changing a definition after go-live (`CDF-08`)
| Change | Safe? | How |
|---|---|---|
| Add status / action / activity | Yes | New GUID, state-machine pairs, spec, bootstrap, routing table |
| Rename a label | Yes | Translations only |
| Remove a status / action / activity | **No** | `IsActive = False`; migrate open cases first (`COP-04`) |
| Change a transition | Careful | New pair, deactivate the old pair (`CaseStateMachine_*`), decide what happens to cases in the source status |
| Change group of an activity | Yes | Reassign open activities explicitly |
| Change the process | Careful | outsystems-bpt `PVR-01`…`PVR-03` |
| `HasAccessControl` false → true | Careful | Grant access for existing cases first, or users lose them |

## 8. The definition spec and the validator (`CDF-07`, `CDF-10`)
1. Fill `templates/case-definition-spec.md` with the business owner.
2. Export to JSON (format: `scripts/examples/good-definition.json`).
3. `node scripts/check_case_definition.mjs <file> [--json]`; fix every error, justify every warning.

The validator checks GUIDs (format, uniqueness, hand-made patterns), one active initial status, terminals without exits, reachability and dead ends, transitions/actions/activities consistency, group assignment, SLAs and escalation, comments on rejecting actions, label completeness and the CMF length limits (Name/Alias ≤ 50, Description ≤ 200), mixed transition mechanisms, explicit access-control and purge settings, and one definition per module.
