# AGENTS.md — OutSystems CMF

Copy this file (or the block below) into a project's AGENTS.md so any agent follows the CMF standards.

<!-- BEGIN core rules -->
# OutSystems CMF (Case Management Framework) — core rules (compact, for any agent)

You are designing, building or reviewing an OutSystems 11 case-management app on the Case Management Framework (CMF). The full skill is in `outsystems-cmf/`: `SKILL.md` is the entry point, `references/` hold the details, `references/review-checklist.md` defines the rule IDs. Layering comes from `outsystems-architecture`; BL code from `outsystems-backend-conventions`; processes from `outsystems-bpt`; screens from `outsystems-frontend-conventions`.

**Precedence**: project conventions > this house standard > OutSystems CMF documentation; the installed CMF modules are the truth for API names. Security and status-integrity rules are never relaxed silently: flag and ask.

**Placement**: CMF is a shared Core framework app, installed as shipped, same version everywhere, never edited. Only `<App>_BL` (folder `CaseManagement`, adapter `_CmfAdapter`) references `CaseServices_API` / `CaseConfigurations_API` / `CaseProcessConfigurations_API`. CS holds the business entity (`CaseId`, mirrored `StatusId`) and configuration static entities; CW holds case blocks; FE holds inbox, detail, activity screens and the activity→screen routing table.

**Always**
- Use CMF only for real case management (many statuses, group queues, SLAs, per-case access); otherwise a status lifecycle or plain BPT.
- Inventory the installed CMF `_API` modules first (`references/cmf-api-map.md` is the starting list); never write a CMF action name from memory.
- Write and validate the case-definition spec before building: `node outsystems-cmf/scripts/check_case_definition.mjs <definition.json>`.
- One case definition per CS module. Business entity Id = Case Identifier from `Case_Initialize`.
- `CaseDefinitionConfiguration` / `CaseStatusConfiguration` records with GUIDs generated once, never changed, reused or copied; Name/Alias ≤ 50; one initial status; unused items set `IsActive = False`, never deleted.
- A "When Published" bootstrap calls the non-deprecated setup action with complete `SetupData`, then verifies what CMF registered and that the definition is Ready. A status only in your static entity is not known to CMF.
- CMF never changes status by itself: the wrapper passes the target status (`Case_CloseActivity` with Status, or `Case_UpdateStatus` for system transitions), one mechanism per transition, every transition registered as a state-machine pair.
- `Case_CloseActivity` commits the transaction: validate and write everything (including the entity's status mirror) first, close last — or use `Case_CloseActivityAsync` deliberately.
- Human activities assigned to groups; pickup/takeover/release/block/skip through BL wrappers; allowed actions recomputed on the server; rejecting actions require a comment; the process ends with `Case_Complete`.
- `HasAccessControl = True` for restricted cases; minimal definition-level grants, per-case grants at instance level (highest wins); every wrapper checks role + CMF access + ownership; ids reloaded; no CMF reads for anonymous users.
- Create the case and launch its process explicitly inside the BL use case, then `Case_AssociateProcess`; no Destination screens from Core processes.
- Purge settings explicit; due dates tested with real calendars on the installed version; CMF modules are protected — diagnose via API and logs, never SQL on CMF tables.
- SLAs with CMF calendars on the server; every SLA has an escalation. Delegation via CMF. Notifications after commit (templates or outbox).
- Case history = CMF timeline + Audit_Lib for business data; timeline fetched on demand through a role-filtered BL wrapper.
- Inbox server-side paged/filtered with counts in one call; action bar built from server options with a double-submit guard.
- CMF upgrades and process/definition changes are separate changes with an API diff, a running-instance plan and a regression run.
- Verify every transition of the spec in the running app before saying "done".
<!-- END core rules -->
