# Architecture and modules for CMF apps

Rules: `CAR-01` … `CAR-10`. Builds on the architecture skill (`ARC-*`, `HSE-*`), the backend skill (`BLG-*`, `BNM-*`) and outsystems-bpt (`PAR-*`).

## Contents
1. Is CMF the right tool?
2. CMF as a shared Core framework app
3. The house chain with CMF
4. The official tutorial shape and how it maps
5. The wrapper (anti-corruption layer)
6. Naming
7. Folders
8. Several case-management apps on one CMF
9. Variants the project may choose

## 1. Is CMF the right tool? (`CAR-09`)
| Need | Use |
|---|---|
| A record with a few statuses edited by users, no tasks or SLAs | Status + transition actions in BL (`BLG-05`) — no CMF, no BPT |
| One or two approval steps, simple routing | Plain BPT (outsystems-bpt decision table) |
| Case types with many statuses, human activities, group work queues, pickup/takeover/delegation, SLAs with calendars, access control per case, timeline, milestones, subcases | **CMF** |
| ODC | ODC workflows — CMF is O11 only |
CMF adds a dependency, a bootstrap, protected modules and an upgrade lifecycle. Record the choice and the reason in the blueprint.

## 2. CMF as a shared Core framework app (`CAR-01`, `CAR-02`)
- Install CMF as shipped (Forge 9179), in **its own application**, owned by the platform team, at the **same version in every environment** (`COP-01`).
- It sits below your apps in Core, above Foundation (Common Shared Services).
- Consume only its **public `_API` modules** (`CaseServices_API`, `CaseConfigurations_API`, `CaseProcessConfigurations_API`). Internal `CM_*` modules are implementation: no references (the documented exception: the `PurgeType` static entity of `CM_CaseDefinition_CS`), no direct entity reads, no SQL (`CAR-01`).
- CMF modules are **protected** (can't be opened). Never clone or patch them (`CAR-02`); work around gaps in your adapter and raise them on the Forge component.

## 3. The house chain with CMF (`CAR-04`)
```
<App>_Front_End ─► <App>_CW ─► <App>_BL ─► <App>_CS
                                  │  ▲
                <Concept>_BPT /   │  └── (optional) processes sublayer above BL (PAR-06)
                <App>_WF          ▼
                       CaseServices_API · CaseConfigurations_API · CaseProcessConfigurations_API
```
| Module | CMF responsibility | Never |
|---|---|---|
| `<App>_CS` | Business entity whose **Id is a Case Identifier** (`CAR-10`), mirrored `StatusId`, audit columns; configuration static entities `CaseDefinitionConfiguration`, `CaseStatusConfiguration` (+ actions/activities keys) with GUIDs; CRUD wrappers. **One case definition per CS module** (`CDF-11`) | reference CMF API modules (house default); call CMF |
| `<App>_BL` | `CaseManagement/` wrappers; `Case_Initialize` inside the create use case; bootstrap timer and setup; status mirror; access checks; processes (folder `Processes`) unless a `_BPT`/`_WF` sublayer exists; case Structures | expose CMF structures; screens |
| `<Concept>_BPT` / `<App>_WF` (optional) | Processes; activities call BL `_Logic`; `Case_AssociateProcess` at process start through a BL action | call CMF APIs directly (go through BL wrappers) |
| `<App>_CW` | Case blocks: inbox, header, action bar, timeline, notes, documents, subcases | reference CMF; build URLs |
| `<App>_Front_End` | Inbox and detail screens, activity screens, **activity → screen routing table**, admin screens | business rules; CMF calls |

**Why only BL**: BL is the single place with authorization, transaction order (`CAC-09`) and the status mirror. A CW data action calling `CaseServices_API` bypasses all three and becomes a public REST endpoint protected only by screen roles (`SEC-01`).

## 4. The official tutorial shape and how it maps (`CAR-08`)
The official "Create a case management app" tutorial and the **Case Management App Starter** produce:
| Official | Content | House mapping |
|---|---|---|
| `<business-entity>_CS` | Business entity (Id = Case Identifier, Expose Process Events), `CaseDefinitionConfiguration`, `CaseStatusConfiguration`, `<Entity>_Create` calling `Case_Initialize`, timer `Bootstrap_CaseConfiguration` (When Published) calling `SetupCaseManagementApplication` | Entity + static entities stay in CS; `_Create` use case and the bootstrap move to BL (house default) |
| `<app>_WF` | Process launched on Create of the entity; `Case_AssociateProcess` at start; final `Case_Complete` | = `<Concept>_BPT` sublayer; **launch explicitly** from BL (`PAR-04`), keep `Case_AssociateProcess` and final `Case_Complete` |
| `<app>_UI` | Reactive test screen (Anonymous for testing) | Replace with FE + CW; never ship Anonymous screens (`SEC-07`) |
If a project already follows the tutorial (CMF calls in CS), accept it as a **documented variant**: keep CMF calls in CS limited to `Case_Initialize` and the bootstrap, keep all runtime operations in BL wrappers, and record the decision in AGENTS.md. Don't silently move built modules.

## 5. The wrapper (anti-corruption layer) (`CAR-03`, `CAR-05`, `CAR-06`)
```
Request_Approve (public Server/Service Action, BL/CaseManagement/Request)
  1. Authorize: role + ownership/assignment + CMF access (Activity_ValidateUserAccess)   (CSC-01)
  2. Load: Request by Id (= CaseId), the open activity; Case_CheckActivityIsActive,
     Activity_CheckIsBlocked                                                              (CSC-02)
  3. Validate: action allowed for this activity and user (spec + Activity_GetActionList),
     comment rules, business rules (_Validate)                                            (CAC-02)
  4. Request_Approve_Logic (private):
       a. business writes + outbox rows + StatusId mirror (target status from the spec)   (CST-01)
       b. LAST: Case_CloseActivity(…, Status = target)  — commits the transaction         (CAC-09)
          (or Case_CloseActivityAsync when the close must not commit here)
  5. Map → ActionResult / RequestCaseSummary (BL Structures)                              (CAR-05)
```
- **Every CMF action name and signature comes from the inventory of the installed modules** (`CAR-03`); `references/cmf-api-map.md` is the starting list. Re-inventory on every CMF upgrade.
- One wrapper per **business use case**, not per CMF action.
- CMF identifiers that the UI needs travel as opaque ids inside BL Structures; CMF structures never leave BL (`CAR-05`).
- All CMF calls go through `CaseManagement/_CmfAdapter` private actions (`Cmf_CloseActivity`, `Cmf_GetActionList`…), so an upgrade changes one folder (`CAR-06`).
- Map CMF exceptions (permission denied, invalid status) to the house user exceptions (`NotAuthorizedException`, `ConflictException`) in the adapter (`BER-01`).

## 6. Naming (house `Entity_Verb` style; `EntityVerb` if the project uses it)
| Element | Pattern | Example |
|---|---|---|
| Business case entity | `<Concept>` (Id type = Case Identifier) | `Request`, `Complaint` |
| Status mirror | `StatusId` → `<Concept>Status` static entity (or `CaseStatusConfiguration`) | `Request.StatusId` |
| Config static entities | `CaseDefinitionConfiguration`, `CaseStatusConfiguration` (official names) + `<Concept>CaseAction`, `<Concept>CaseActivity`, `<Concept>CaseGroup` | |
| Use-case wrapper (public) | `<Concept>_<DomainVerb>` | `Request_Submit`, `Request_Approve`, `Request_Reassign` |
| Read wrapper | `<Concept>Case_Get…` | `RequestCase_GetInbox`, `RequestCase_GetTimeline` |
| CMF adapter (private) | `Cmf_<Verb><Object>` | `Cmf_CloseActivity` |
| Bootstrap | `Timer_<Concept>CaseBootstrap` → `<Concept>Case_Bootstrap` (or the official `Bootstrap_CaseConfiguration` if already built) | |
| Process | `<Concept><Workflow>` (outsystems-bpt) | `RequestApproval` |
| Human activity / action | `<Verb><Object>` / business verb | `ReviewRequest` / `Approve`, `ReturnForInfo` |
| Block | `Case<Thing>` or `<Concept>Case<Thing>` | `CaseInbox`, `RequestCaseHeader` |
Status names are business states (`Submitted`, `UnderReview`, `PendingInfo`, `Approved`), ≤ 50 characters, with an `Alias` ≤ 50 (`CDF-10`).

## 7. Folders (`HSE-04` + CMF)
| Module | Folders |
|---|---|
| CS | `Entities/<Concept>`, `Lookups/<Concept>`, `Lookups/CaseConfiguration`, `CRUD` |
| BL | `Structures/Case`, `CaseManagement/<Concept>`, `CaseManagement/_CmfAdapter`, `CaseManagement/Bootstrap`, `Processes`, `PrivateActions`, `Timers` |
| CW | `Blocks/Case`, `Blocks/<Concept>`, `UIHelpers` |
| FE | UI flows `Cases` (inbox, detail), `<Concept>` (activity screens), `Administration` |

## 8. Several case-management apps on one CMF (`CAR-07`)
- Each app owns its definitions, GUIDs, groups and processes; one definition per CS module.
- Cross-app subcases or linked cases: call the other app's **Service Action**, never its definition (`ARC-14`).
- A shared `Case_CW` / `Case_BL` Core app for a common case UX is fine when owned by the platform team; it still never lets CW call CMF.

## 9. Variants the project may choose (`CAR-08`)
| Variant | Condition |
|---|---|
| `<Concept>_BPT` / `<App>_WF` process sublayer | Above BL (`PAR-06`); CMF calls still through BL |
| Official tutorial shape (CMF in CS) | Already built, documented; runtime calls still in BL |
| Shared `Case_BL` / `Case_CW` | Platform-owned, generic only |
| Relaxed mode (FE reading CS) | Never extends to CMF calls |
Write the choice in the blueprint (architecture skill: `templates/architecture-blueprint.md` there).
