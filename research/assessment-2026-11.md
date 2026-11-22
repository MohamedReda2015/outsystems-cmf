# Assessment of outsystems-cmf v1.0.0 against official docs and community (2026-11-22)

Method: official O11 CMF documentation (create a case management app, case status, activities, permissions, Case Configurations API reference, App Starter), Forge 9179 release notes, OutSystems forum threads with staff/MVP answers, third-party blogs. Sources and confidence in `research/sources.md`. Result: v1.1.0.

## Findings that made v1.0.0 wrong (corrected)
| # | v1.0.0 said | Evidence | Fix in 1.1.0 |
|---|---|---|---|
| 1 | Closing an activity with an action moves the status "per configuration" | Staff answer: CMF never updates status automatically, even with a state machine; `Case_CloseActivity` changes status only when its Status input is set | `CST-04` rewritten, new `CST-08`: the wrapper always passes the target status from the spec |
| 2 | Mirror updated "in the same transaction as the CMF call" | Official Activities page: `Case_CloseActivity` runs synchronously with default BPT behaviour and commits the current transaction; `Case_CloseActivityAsync` closes later via a process | New `CAC-09`: validate and write everything first, close the activity last (or Async); `CST-01` reworded |
| 3 | Static entity records with GUIDs are what CMF validates | MVP answer: CMF validates against `CaseStatus` in `CM_CaseDefinition_CS`, filled by the setup action run by the bootstrap timer | `CDF-03` and runbook: verify via `CaseDefinition_GetStatusList` / `CaseDefinition_CheckValidStatus`; new lesson `CLL-18` |
| 4 | Generic "bootstrap registers the definition" | Official: `SetupCaseManagementApplication(SetupData)` from a "When Published" timer; `SetupData` = BusinessEntityEspaceId (`GetOwnerEspaceId()`), CaseDefinition, CaseStatusList, CaseStateMachineList, CaseActionList, EmailTemplateList, MilestoneDefinitionList; `DEPRECATED_SetupCaseManagementApplication` exists | New `CDF-09`; bootstrap section rewritten |
| 5 | `CaseId` attribute 1:1 on the business entity | Official: business entity **Id is of type Case Identifier**, set from `Case_Initialize` | `CAR-10`; naming and architecture updated |
| 6 | Access: "CMF instance access" as one thing | Staff: checked only if the definition has `HasAccessControl`; highest of definition vs instance wins (Write > Read); `Case_UpdateGroupAccess` (instance) vs `CaseDefinition_UpdateGroupAccess` (definition); single-case actions throw, list actions silently filter; since 1.5.2 fetch actions require a registered user | New `CSC-09`, `CSC-10`; security reference rewritten |

## Gaps filled (new content)
- Choosing CMF vs plain BPT / status lifecycle / Workflow Builder (`CAR-09`).
- Official module shape (`<Entity>_CS`, `<App>_WF`, `<App>_UI`), App Starter scaffold and how it maps to the house chain (`CAR-08`, `COP-10`).
- Real CMF action catalogue (lifecycle, activity collaboration, access checks, configuration, calendars, rules, milestones, email templates, delegation, groups) in a new `references/cmf-api-map.md`, marked verified/unverified.
- Activity collaboration semantics: pickup, takeover, release, block/unblock, skip, open, multiple-instance activities (`CAC-11`).
- `Case_Complete` as the final step (`CAC-10`).
- Purge/retention settings `DaysToPurgeCase` / `DaysToPurgeProcess` / `PurgeTypeId` (`CSL-09`).
- Calendars, holidays, non-working days via the configuration API; due-date bugs by version (`CSL-10`).
- Inbox using `Case_GetActivities`, `Case_GetCasesByActivityCounters`, `ActivityAssignementStatusId`, and the 1.5.1 `MyActivities` change (`CUI-09`).
- Protected modules: diagnose via APIs and logs, never SQL (`COP-09`).
- Name/Alias ≤ 50, description ≤ 200 limits; one definition per CS module (`CDF-10`, `CDF-11`, validator).
- Ten new public lessons (`CLL-18`…`CLL-27`) and a version-bug table.

## Deliberate house deviations from the official tutorial (kept, documented)
| Official tutorial | House | Why |
|---|---|---|
| `<Entity>_CS` references `CaseServices_API` / `CaseConfigurations_API` and holds `_Create` + bootstrap | Default: BL holds `Case_Initialize`, bootstrap and every CMF call; CS stays CMF-free. Variant allowed when a project already follows the tutorial (`CAR-08`) | Keeps authorization, transactions and the mirror in one place (`HSE-*`, `BLG-01`) |
| `<App>_WF` process with Launch On = Create of the business entity | Explicit `Launch<Process>` inside the BL use case, then `Case_AssociateProcess` at process start | outsystems-bpt `PAR-04`: imports and copies would launch processes |
| Test screen set to Anonymous | Never outside a throw-away DEV test module | `SEC-07` |

## Still unverified (requires the installed modules)
CaseServices_API and CaseProcessConfigurations_API reference pages returned 404; action lists come from the permissions and activities pages and the forum. SLA configuration actions, rule-engine evaluation actions, email notification triggering and subcase actions must be read from the installed version.
