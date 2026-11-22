# Case lifecycle: statuses, transitions, activities, actions

Rules: `CST-01` … `CST-09`, `CAC-01` … `CAC-11`. Process design (flow, waits, Light BPT, versioning) is owned by **outsystems-bpt**; transactions (`BTX-*`) and async (`BAS-*`) by the backend skill. API names: `references/cmf-api-map.md`.

## Contents
1. The state machine
2. Status truth and the mirror
3. How status actually changes in CMF
4. Transaction order when closing activities
5. Activities
6. Activity collaboration
7. Activity actions
8. Rules (conditions)
9. Subcases, linked cases, milestones
10. Process ↔ case integration

## 1. The state machine (`CST-03`, `CST-09`)
Draw it first. A typical request:
```
Draft ──Submit──► UnderReview ──Recommend──► PendingApproval ──Approve──► Approved
                    │   ▲                          └──Reject──► Rejected
          ReturnForInfo │ ProvideInfo
                    ▼   │
                 PendingInfo ──system:SlaExpired──► Cancelled
```
- Every arrow is a **declared transition** in the spec: from, to, trigger (activity + action, or `system:<Reason>`), condition, who.
- CMF's state machine stores only the **pairs** (`Setup_CaseStateMachine`: From, To, IsActive). Register every pair of the spec (`CST-09`); CMF then rejects any other move in `Case_UpdateStatus` / `Case_CloseActivity`.
- Exactly one initial status (`IsInitial`); terminals have no exits; every status reachable and able to reach a terminal (validator).
- 5–10 statuses. A status exists only if someone filters, reports or applies an SLA on it.

## 2. Status truth and the mirror (`CST-01`, `CST-02`)
- **CMF's case status, validated by its state machine, is the workflow truth.** The business entity's `StatusId` mirror is what every screen, list and report reads — how a CMF app satisfies outsystems-bpt `PAR-03`.
- The mirror is written **only by the BL wrapper**, in the same commit as the CMF status change (ordering in §4).
- A reconciliation timer compares mirror and CMF (`Case_GetDetailsByCaseId`) for open cases and reports drift.
- Status ids passed to CMF are this definition's GUIDs, active and registered. Others fail with "Status is not valid for the status set" (`CST-02`, `CLL-01`, `CLL-18`).

## 3. How status actually changes in CMF (`CST-04`, `CST-08`)
**CMF never changes a case status by itself**, even with a state machine configured (OutSystems staff answer). Your code passes the target:
| Mechanism | Use for | Behaviour |
|---|---|---|
| `Case_CloseActivity(…, Status = target)` | user decisions that finish a human activity | closes the activity and updates the status; **empty Status = status unchanged** |
| `Case_UpdateStatus(CaseId, target)` | system transitions (`system:SlaExpired`, integration results) and moves without an activity | validates the status belongs to the definition and the pair is allowed |
- The wrapper looks up the target status from the spec's transition table (`activity + action → to`) and passes it explicitly (`CST-08`). Never infer it on the client.
- For the UI, the allowed next statuses come from `Case_GetAllPossibleStatus` and the allowed actions from the activity (§7) — via BL.
- **One mechanism per transition** (`CST-04`): the same pair reached once by closing an activity and elsewhere by `Case_UpdateStatus` leaves cases with a status and open activities that disagree (`CLL-02`).
- CMF raises exceptions for invalid moves and does **not** handle them: the adapter maps them to `ConflictException` / `BusinessRuleException` with a user-safe message (`BER-01`).
- Backward moves are modeled transitions (`Reopen`) (`CST-06`); closed cases are read-only (`CST-07`).

## 4. Transaction order when closing activities (`CAC-09`)
`Case_CloseActivity` is synchronous with default BPT behaviour and **commits the current transaction** (official Activities page). So:
```
Request_Approve_Logic
  1. validate everything (access, active, not blocked, allowed action, comment, business rules)
  2. write business data, history/outbox rows, StatusId mirror = target
  3. LAST STEP: Cmf_CloseActivity(ActivityId, Status = target)      ← commit happens here
  (nothing after this that could fail and expect a rollback)
```
- If something must run after the close and may fail, put it in the process (next activity) or the outbox, not in the same action.
- `Case_CloseActivityAsync` requests asynchronous closure. Verify its implementation/contract and failure behavior in the installed version before relying on caller transaction semantics. Record the requested outcome separately from confirmed status, expose pending progression, and reconcile completion or failure; never claim the business mirror and future closure are atomic.
- Never call either close in a loop inside one request (bulk actions → timer/BPT batch).

## 5. Activities (`CAC-01`, `CAC-03`, `CAC-04`, `CAC-05`, `CAC-10`)
- **Human activities** are BPT human activities extended by CMF.
  - Assigned to a **group** (`Activity_AssignToGroup`; `…ToGroupAndUser` / `…ToUser` only for explicit reassignment) (`CAC-01`).
  - **House routing default**: the FE routing table maps activity key → screen (`CAC-03`). Reactive human-activity destinations are supported on suitable O11 versions (see BPT `PHA-08`); a weak screen destination is not an upward strong-reference violation. Preserve a supported existing design. `Case_OpenActivity` returns a URL: use it only if it fits your routing, through BL.
  - Every human activity has an SLA and escalation (`CSL-01`, `CSL-05`).
  - **Multiple-instance activities**: one activity can be assigned to several users and launches once per user; completion can require all or a subset. Model "all approvers" this way or with child processes (`PDS-10`).
- **Automatic activities**: small, idempotent, call BL `_Logic`, no slow external calls, side effects through the outbox (`CAC-04`, `BTX-06`).
- **Waits**: process waits or status + SLA, never per-case polling (`CAC-05`).
- **Completion**: the case process ends with `Case_Complete` as its final step, after the terminal status is set (`CAC-10`).

## 6. Activity collaboration (`CAC-07`, `CAC-11`)
| Use case (BL wrapper) | CMF action | Who may | CMF rule |
|---|---|---|---|
| `Request_TakeTask` | `Case_PickupActivity` | group member or delegate | unassigned, or group-assigned to their group; not if assigned to a specific user |
| `Request_TakeOverTask` | `Case_TakeoverActivity` | same group or delegation; supervisors per house role | already assigned, not blocked |
| `Request_ReleaseTask` | `Case_ReleaseActivity` | the assignee | also unblocks |
| `Request_BlockTask` / `UnblockTask` | `Case_BlockActivity` / `Case_UnblockActivity` | assignee or delegate | blocked = others can't open, close or skip |
| `Request_SkipStep` | `Case_SkipActivity` | supervisor (house role) | audited, reason required |
| `Request_Reassign` | `Activity_AssignToGroupAndUser` / `…ToUser` | supervisor | grant instance access in the same wrapper (`CSC-04`) |
Each wrapper adds the house role check on top of CMF's rule and handles "already taken / blocked" as `ConflictException` (`CUI-05`).

## 7. Activity actions (`CAC-02`, `CAC-06`)
- Allowed actions = spec actions for this activity ∩ what CMF reports (`Activity_GetActionList`; it returned nothing before 1.5.1, `CLL-27`) ∩ house role rules. BL returns `CaseActionOption {Key, Label, NeedsComment, NeedsConfirmation, IsDestructive}`.
- The UI renders the action bar from that list; on submit the wrapper **re-computes** it and rejects anything else (`CSC-03`).
- Rejecting/returning actions require a comment, stored with `Case_AddComments` or the action, visible in the timeline (`CAC-06`).

## 8. Rules (conditions) (`CAC-08`)
- CMF rules engine (`Rule_*`, `RuleGroup_*`, `RuleLine_*`; logical, group, user, status conditions) is for **routing and availability**. Business validation stays in BL `_Validate` (`BLG-04`).
- Rules are configuration: create them in the bootstrap or admin screens, name them by meaning, test each branch. Staging imports use `Rules_InitializeStaging`.

## 9. Subcases, linked cases, milestones
- **Subcase**: a child case whose outcome the parent waits for. The parent's dependent transition is a `system:` transition when the child closes. Same app → BL wrapper; other app → its Service Action. List with `Case_GetAllSubcases`.
- **Linked case**: reference without lifecycle dependency.
- **Milestones**: `MilestoneDefinition_*` linked to the definition (`CaseDefinition_LinkToMilestoneDefinition`); record them in the wrapper at the transition that reaches them.

## 10. Process ↔ case integration
- One case definition ↔ one main process (`<Concept><Workflow>`).
- Create sequence in `Request_Submit` (BL): authorize → validate → `Case_Initialize(CaseDefinitionId)` → create the business record with **Id = CaseId** → `Launch<Process>(RequestId)` (explicit, duplicate guard, `PAR-04`, `PDS-08`) → process start calls `Case_AssociateProcess(CaseId, ProcessId)` through a BL action.
- The official tutorial launches the process on Create of the business entity; the house doesn't (imports and copies would launch processes, `PLL-01`).
- Process inputs are ids only (`PDS-02`).
- **Tasks**: CMF activities, assignment, delegation and SLA are the task store; no `<App>Task` duplicating them (specialization of `PHA-03`). Claim/completion through BL wrappers with the `PHA-01`/`PHA-05` checks.
- Terminal status → `Case_Complete` → process ends. A closed case with a live process is a defect (`COP-05`).
