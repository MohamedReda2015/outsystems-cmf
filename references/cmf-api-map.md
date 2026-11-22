# CMF API map (O11, Forge 9179, 1.5.x)

**Transaction review:** the official API also documents commits in `Activity_AssignToGroup` and `Case_DiscardActivity`, not just `Case_CloseActivity`. Verify installed behavior and consult [commit inventory](verification-and-reliability.md) before composing calls.


A **starting point for the inventory** (`CAR-03`), never a substitute for it. ✔ = name seen in official docs or release notes; ◐ = from forum answers or partial doc text; verify the signature in the installed module before use. CMF modules are protected: you can reference their public elements but not open them (`COP-09`).

## Modules
| Module | Role | Who references it (house) |
|---|---|---|
| `CaseServices_API` ✔ | Run time: cases, statuses, activities, access, history | `<App>_BL` (`_CmfAdapter`) |
| `CaseConfigurations_API` ✔ | Design time: definitions, statuses, state machine, actions, rules, calendars, milestones, templates, delegation, groups | `<App>_BL` (`Bootstrap`, admin wrappers) |
| `CaseProcessConfigurations_API` ✔ | Process configuration and SLAs | `<App>_BL` |
| `CM_Case_CS`, `CM_CaseDefinition_CS`, `CM_CaseService_BL`, `CM_WorkingDays_CS` ◐ | Internal | nobody (`CAR-01`); `CM_CaseDefinition_CS.PurgeType` static entity is referenced by the official tutorial ✔ |
| Common Shared Services ✔ | Dependency of CMF (1.11.0 for CMF 1.5.3) | CMF only |

## Run time — `CaseServices_API`
Permission column per the official permissions page: **W** = Write, **R1** = Read, single case (throws without access), **RL** = Read, list (silently omits inaccessible cases).

| Area | Action | Perm | Notes |
|---|---|---|---|
| Create | `Case_Initialize` ✔ | – | In `CaseDefinitionId` (from `TextToIdentifier(<GUID>)`), optional `CaseStatusId` (else the initial status). Out `CaseId` → business entity Id. Throws if no initial status |
| Link process | `Case_AssociateProcess` ✔ | – | `CaseId`, `ProcessId`; call at process start |
| Status | `Case_UpdateStatus` ✔ | W | Validates status belongs to the definition and, if a state machine exists, the transition |
| Status options | `Case_GetAllPossibleStatus` ◐ | R | Next statuses allowed by the state machine (staff answer) |
| Complete | `Case_Complete` ✔ | W | Final step of the case process (App Starter: "must be the final step") |
| Delete | `Case_Delete` ✔ | W | Prefer business cancellation statuses; delete only per retention policy |
| Priority, tags, comments | `Case_UpdatePriority`, `Case_AddTags`, `Case_RemoveTag`, `Case_AddComments` ✔ | W | |
| Activity close | `Case_CloseActivity` ✔ | W | Synchronous, default BPT behaviour, **commits the current transaction**; Status input optional — empty = case status unchanged |
| Activity close (async) | `Case_CloseActivityAsync` ✔ | W | Launches a process that closes the activity later; no commit inside the action |
| Activity collaboration | `Case_PickupActivity`, `Case_TakeoverActivity`, `Case_ReleaseActivity`, `Case_BlockActivity`, `Case_UnblockActivity`, `Case_SkipActivity`, `Case_OpenActivity`, `Case_PerformActionActivity` ✔ | W | Pickup: unassigned, or group member/delegate. Takeover: already assigned, not blocked, same group or delegation. Release: assignee only, also unblocks. Block: assignee or delegate; blocked activities can't be opened/closed/skipped by others. Open returns a URL |
| Activity state | `Case_CheckActivityIsActive` ✔, `Activity_CheckIsBlocked` ✔ | – | Guard before acting (`CSC-02`) |
| Assignment | `Activity_AssignToGroup`, `Activity_AssignToGroupAndUser`, `Activity_AssignToUser` ✔ | – | Group by default (`CAC-01`) |
| Access check | `Activity_CheckUserAccess` (Boolean), `Activity_ValidateUserAccess` (raises) ✔ | – | Includes delegation |
| SLA | `Activity_CalculateExecutionTime` ✔, `Activity_CalculateAndSetDueDate` ✔ | – | Due-date bugs fixed in 1.5.2; still test with calendars (`CLL-24`) |
| Actions | `Activity_GetActionList` ✔ | – | Returned nothing before 1.5.1 (`CLL-27`) |
| Lists | `Case_GetActivities` ✔ (MyActivities + `ActivityAssignementStatusId` AssignToMe / AssignedToAnyone / AssignedToOthers since 1.5.1), `Case_GetActivitiesByCaseId`, `Case_GetCasesByActivity`, `Case_GetCasesByActivityCounters` (1.5.1) ✔, `Case_GetAllByUserWithAccess`, `Case_GetAllByGroupWithAccess`, `Case_GetAllByUserId`, `Case_GetAllByExternalRequester`, `Case_GetByTagId`, `Case_GetByTagLabel`, `Case_GetCases` ✔ | RL | |
| Detail and history | `Case_GetDetailsByCaseId`, `Case_GetActivitiesTimeline`, `Case_GetHistory`, `Case_GetAllHistoryByIdAndDate`, `Case_GetAllTags`, `Case_GetAllSubcases` ✔ | R1 | Timeline group-assignment fix in 1.5.3 |
| Access grants | `Case_UpdateGroupAccess` ◐ | – | **Instance** level only; raises if used for definition-level rights |

Since 1.5.2, service actions that fetch case and activity data throw unless the user is a registered user (`CSC-10`, `CLL-25`).

## Design time — `CaseConfigurations_API`
| Area | Actions ✔ |
|---|---|
| Setup / bootstrap | `SetupCaseManagementApplication(SetupData)` (service action), `DEPRECATED_SetupCaseManagementApplication`, `BootstrapCaseConfiguration(CaseConfigurationBootstrap)`, `CaseStatus_Bootstrap(CaseDefinitionId, CaseStatusList)` (replaces or creates statuses), `CaseAction_Bootstrap(CaseDefinitionId, CaseAction_CreateOrUpdateLst)`, `CheckApplicationStatus` |
| `SetupData` | `BusinessEntityEspaceId` (`GetOwnerEspaceId()` when the entity is in the same module), `CaseDefinition`, `CaseStatusList`, `CaseStateMachineList`, `CaseActionList`, `EmailTemplateList`, `MilestoneDefinitionList` |
| `Setup_CaseDefinition` | `CaseDefinitionId`, `Name` (50), `Description` (200), `HasAccessControl`, `PurgeTypeId`, `DaysToPurgeCase` / `DaysToPurgeProcess` (< 0 never, 0 system default, > 0 days), `TranslationList` |
| `Setup_CaseStatus` | `CaseStatusId`, `Name` (50), `Alias` (50), `IsInitial` (only one), `IsActive`, `TranslationList` |
| `Setup_CaseStateMachine` | `FromCaseStatusId`, `ToCaseStatusId`, `IsActive` — pairs only; actions, conditions and roles live in your spec and BL |
| Definitions | `CaseDefinition_Create/_CreateOrUpdate/_Update/_Delete/_Purge/_GetAll/_GetById`, `_GetInitialStatus`, `_GetStatusList`, `_CheckValidStatus`, `_GetProcessDefinitionId`, `_GetProcessDefinitionList`, `_GetActions`, `_GetEligibleToPurge`, `_LinkToMilestoneDefinition`, `_UnlinkFromMilestoneDefinition`, `CaseDefinition_UpdateGroupAccess` ◐ (definition-level rights) |
| Statuses, state machine | `CaseStatus_Create/_CreateOrUpdate/_Update/_Delete/_GetById`; `CaseStateMachine_Create/_CreateOrUpdate/_Update/_GetByTransition/_Purge` |
| Rules engine | `Rule_*`, `RuleGroup_*`, `RuleLine_CreateOrUpdate` (LeftAttribute, RightAttribute, RuleOperatorId, Order), `RuleGroupOutput_CreateOrUpdate`, `Rules_InitializeStaging` |
| Calendars | `Calendar_*`, `Holiday_*`, `NonWorkingDay_*` (Create, CreateOrUpdate, Update, Delete) |
| Milestones | `MilestoneDefinition_*` (Delete inactivates) |
| Email | `EmailTemplate_*`, `PreDefinedTemplate_*`, `Email_ProcessPlaceholders(CaseId, Text, KeepUnknownTags, IsPreviewMode)`, `NotificationsEngine_InitializeStaging` |
| Delegation | `Delegation_Create/_CreateOrUpdate/_Update/_Delete` |
| Groups and users | `Group_AssignGroupToUser`, `Group_UnassignGroupFromUser`, `GroupExtended_*`, `UserExtended_CreateOrUpdate`, `UserHierarchy_Import`, `ImportUserHierarchy_GetStatus` |
| Tags, settings, misc | `Tag_*`, `CaseTag_Create`, `Setting_*`, `GetSystemDefaultDaysToPurge`, `Espace_GetForActivityScreen` |

Bootstrap entry-point names differ between sources (`Bootstrap_CaseConfiguration` timer in the tutorial, `Timer_SetupApplication` in App Starter, `BootstrapCaseConfiguration` action in the API): **use the inventory** (`CLL-26`).

## `CaseProcessConfigurations_API`
Process configuration and SLA management. The reference page was not reachable when this map was written: inventory it before designing SLAs.
