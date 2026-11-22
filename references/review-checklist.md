# CMF review checklist (enforceable rules)

Every rule has an ID, a severity and a check. Cite the ID in findings. IDs stay stable between versions; new rules get new numbers.

**Severity**: **Blocker** = security hole, data/status corruption or blocked deployment/upgrade; fix before release. **Major** = architecture or real operational cost; fix this release. **Minor** = convention or hygiene; fix when touched.
**Tags**: `[auto]` = checked by `scripts/check_case_definition.mjs` on the definition JSON.

Triage order: Security → Status integrity → Architecture → Performance → Maintainability.

## CAR — Architecture
| ID | Sev | Rule | Check / fix |
|---|---|---|---|
| CAR-01 | Major | Only CMF public `_API` modules are referenced; no internal modules, no CMF entity reads, no SQL on CMF tables | Manage Dependencies of every module |
| CAR-02 | Blocker | CMF modules are not edited or cloned | Compare CMF app version/hash with the Forge release |
| CAR-03 | Major | Every CMF action used exists in the inventory of the installed version | Inventory file vs `_CmfAdapter` |
| CAR-04 | Major | Only `<App>_BL` references CMF API modules (not CS, CW, FE) | Dependencies; move calls into BL wrappers |
| CAR-05 | Major | CMF structures don't leave BL; wrappers return BL Structures | Public signatures of BL |
| CAR-06 | Minor | All CMF calls go through `CaseManagement/_CmfAdapter` private actions | Find CMF references outside the folder |
| CAR-07 | Major | Apps don't read each other's definitions; cross-app subcases via Service Actions | Dependencies |
| CAR-08 | Minor | Variants (process sublayer, official tutorial shape, shared case app) are documented in the blueprint | Blueprint |
| CAR-09 | Major | CMF chosen deliberately (vs status lifecycle / plain BPT) and the reason recorded | Blueprint; decision table |
| CAR-10 | Minor | Business entity Id is a Case Identifier set from `Case_Initialize` (or a unique 1:1 `CaseId` in a documented legacy design) | Entity properties |

## CDF — Definitions and configuration
| ID | Sev | Rule | Check / fix |
|---|---|---|---|
| CDF-01 | Major | Statuses, activities, actions, group keys are static entity records with stored GUIDs/keys | CS `Lookups/CaseConfiguration` |
| CDF-02 | Blocker | GUIDs are unique, well-formed, never changed/reused/copied `[auto]` | Validator; compare with production |
| CDF-03 | Major | The bootstrap is idempotent, logged, runs on publish, has a kill switch | Run it twice; read log |
| CDF-04 | Major | The bootstrap verifies the registered definition against the static entities and fails loudly | Bootstrap logic |
| CDF-05 | Major | Environment-specific data (members, calendars, per-env SLA) is admin/seeded data, not static/hard-coded; seeds off in PRD | Config review |
| CDF-06 | Minor | Labels come from translations/server, keys `<Concept>.Status.<Name>`; all declared languages present `[auto]` | Screens; validator |
| CDF-07 | Major | A spec exists, is versioned and validated before build `[auto]` | Spec + validator output |
| CDF-08 | Major | Post-go-live changes follow the change table (deactivate, never delete) | Diff of static entities |
| CDF-09 | Major | Setup uses the non-deprecated action with complete `SetupData` (espace id of the entity's module, definition, statuses, state machine, actions, templates, milestones) and waits for the definition to be Ready | Bootstrap code; run log |
| CDF-10 | Minor | Definition/status Name and Alias ≤ 50 chars, Description ≤ 200 `[auto]` | Validator |
| CDF-11 | Major | One case definition per CS module `[auto]` | Module inventory |

## CST — Status integrity
| ID | Sev | Rule | Check / fix |
|---|---|---|---|
| CST-01 | Blocker | CMF's state machine is the workflow truth; the entity mirror (read by UI/reports) is written only by the wrapper and committed together with the CMF change (writes before the close, `CAC-09`) | Find all writes of `StatusId`; reconciliation log |
| CST-02 | Blocker | Status values come from this definition's records; no cross-definition statuses | Wrapper code; validator |
| CST-03 | Major | Every status change is a declared transition; one initial, reachable statuses, terminals without exits `[auto]` | Validator + code paths |
| CST-04 | Major | One transition mechanism per transition (activity action vs explicit update) `[auto: declared]` | Spec + wrappers |
| CST-05 | Major | Used statuses/activities/actions are deactivated, never deleted | Static entity history |
| CST-06 | Minor | Backward moves are modeled transitions (`Reopen`), with permission | Spec |
| CST-07 | Major | Closed cases are read-only except through a declared transition | Wrappers check status |
| CST-08 | Blocker | The wrapper passes the target status explicitly (CMF never moves status by itself; `Case_CloseActivity` without Status changes nothing) | Every close/update call |
| CST-09 | Major | Every spec transition is registered as a CMF state-machine pair; deprecated pairs inactive `[auto: spec side]` | `SetupData.CaseStateMachineList` vs spec |

## CAC — Activities and actions
| ID | Sev | Rule | Check / fix |
|---|---|---|---|
| CAC-01 | Major | Human activities assigned to groups, never to named users `[auto]` | Process / spec |
| CAC-02 | Blocker | Allowed actions come from CMF via BL and are re-checked on submit | Action wrappers |
| CAC-03 | Major | House default: FE routing table; a supported weak Reactive screen destination is a documented alternative, not an upward strong-reference violation | Process properties; dependencies |
| CAC-04 | Major | Automatic activities small, idempotent, no slow external calls, side effects via outbox | Activity logic |
| CAC-05 | Minor | Waits modeled as process waits/status+SLA, not per-case polling | Process design |
| CAC-06 | Major | Rejecting/returning actions require a comment stored in CMF `[auto]` | Spec + wrapper |
| CAC-07 | Major | Collaboration actions (take, release, reassign, delegate, escalate) are separate wrappers with their own permissions | BL |
| CAC-08 | Minor | CMF rules decide routing/availability only; business validation in BL | Rules list |
| CAC-09 | Blocker | `Case_CloseActivity` is the last step of the wrapper (it commits); nothing after it relies on rollback; or `Case_CloseActivityAsync` is used deliberately | `_Logic` flow order |
| CAC-10 | Major | The case process ends with `Case_Complete` after the terminal status | Process |
| CAC-11 | Major | Pickup / takeover / release / block / skip go through BL wrappers over the CMF actions, with house role checks and conflict handling | BL |

## CSC — Security (never relaxed)
| ID | Sev | Rule |
|---|---|---|
| CSC-01 | Blocker | Role + CMF instance access + ownership/assignment checked in every wrapper |
| CSC-02 | Blocker | Ids from the client are reloaded; activity open and belonging to the case |
| CSC-03 | Blocker | Action key must be in the server-side allowed list |
| CSC-04 | Major | Instance access granted/revoked in the same wrapper that changes who works the case |
| CSC-05 | Major | One group ↔ role mapping used by both assignment and authorization |
| CSC-06 | Blocker | Inbox/search filter access in the server query, paged and bounded |
| CSC-07 | Blocker | Documents/notes served through access-checked server actions; uploads scanned |
| CSC-08 | Blocker | Identity and delegation resolved on the server only |
| CSC-09 | Blocker | Restricted definitions have `HasAccessControl = True`; definition-level grants minimal; correct action per level (`CaseDefinition_UpdateGroupAccess` vs `Case_UpdateGroupAccess`); highest-wins understood `[auto: flag set]` |
| CSC-10 | Major | CMF permission exceptions mapped to `NotAuthorizedException`; silent list filtering handled; no CMF reads for unregistered/anonymous users |

## CSL — SLA, delegation, notifications, audit
| ID | Sev | Rule |
|---|---|---|
| CSL-01 | Major | SLAs with CMF calendars, computed on the server; every human activity has an SLA `[auto]` |
| CSL-02 | Major | Delegation through CMF; no client "acting for" flags |
| CSL-03 | Blocker | Notifications after commit (templates or outbox), never inside the activity transaction |
| CSL-04 | Minor | No third history table duplicating CMF audit or Audit_Lib |
| CSL-05 | Major | Every SLA has an escalation path `[auto]` |
| CSL-06 | Minor | SLA pauses modeled explicitly; holidays loaded ahead |
| CSL-07 | Major | External users receive status-level information only |
| CSL-08 | Minor | Timeline via BL read wrapper: role-filtered, localized, paged, on demand |
| CSL-09 | Major | Purge settings (`PurgeTypeId`, `DaysToPurgeCase`, `DaysToPurgeProcess`) explicit and aligned with retention `[auto]` |
| CSL-10 | Major | Due dates tested with calendars (weekends, holidays, year change, time zones) on the installed version |

## CUI — UI
| ID | Sev | Rule |
|---|---|---|
| CUI-01 | Major | Inbox tabs, server-side paging/filter/sort, counts in one call, filters kept |
| CUI-02 | Major | Detail header at start; tabs on demand |
| CUI-03 | Major | Action bar from server options; comment/confirm; one call; double-submit guard |
| CUI-04 | Minor | Routing table for activity keys; unknown keys handled |
| CUI-05 | Minor | Conflict (already taken/closed) explained and refreshed |
| CUI-06 | Minor | Timeline paged, grouped, internal comments hidden for externals |
| CUI-07 | Major | Status/SLA not by color alone; server labels; RTL tested |
| CUI-08 | Minor | Generic case blocks with contracts and placeholders |
| CUI-09 | Major | Inbox built on CMF list semantics: `ActivityAssignementStatusId` per tab, counters in one call, silent access filtering understood |

## COP — Operations
| ID | Sev | Rule |
|---|---|---|
| COP-01 | Major | Same CMF version in all environments, recorded |
| COP-02 | Major | Deployment order followed; bootstrap log checked; smoke test |
| COP-03 | Major | CMF upgrades are separate changes with API diff and regression |
| COP-04 | Blocker | Process/definition changes have a running-instance and migration plan tested on production-like data |
| COP-05 | Major | Monitoring of overdue, errors, drift, bootstrap, notifications; kill switches |
| COP-06 | Minor | Diagnosis runbook used; fixes via audited admin transitions, never SQL on CMF |
| COP-07 | Major | Transition matrix tested (positive and negative per role) |
| COP-08 | Major | Regression suite on every CMF upgrade and process change |
| COP-09 | Major | Protected CMF modules diagnosed via public API, Service Center and adapter logs; no SQL on CMF internal tables |
| COP-10 | Minor | App Starter scaffolds renamed, GUIDs regenerated, examples removed and aligned to house layers before the first feature |


## Reliability and evidence (2026-11 review)

These manual checks complement, rather than extend the claimed coverage of, the static scripts. Details and acceptance cases: [verification and reliability](verification-and-reliability.md).

| ID | Severity | Rule |
|---|---|---|
| CRV-01 | Major | Inventory every commit-capable CMF call, including assignment and discard, against the installed version. |
| CRV-02 | Major | Separate requested async outcomes from confirmed CMF status and reconcile drift. |
| CRV-03 | Major | Verify bootstrap registration and effective access/action-specific permissions. |
| CRV-04 | Major | Test recovery, live cases and framework upgrades through supported APIs. |
