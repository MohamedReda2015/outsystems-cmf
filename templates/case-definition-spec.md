# Case definition spec: <Concept>

> Fill with the business owner before building. Export to JSON (format: `scripts/examples/good-definition.json`) and run `node scripts/check_case_definition.mjs <file>` until it reports 0 errors. Version every change.

| Field | Value |
|---|---|
| Definition key / GUID | `<Concept>` / `<generated once, never changed>` |
| Spec version / date | 1.0 / YYYY-MM-DD |
| Business owner / tech owner | |
| Owning app and modules | `<App>_CS`, `<App>_BL`, `<App>_CW`, `<App>_Front_End` |
| CMF version tested | 1.5.x |
| Languages | en, ar |
| CS module (one definition per module) | `<Concept>_CS` (`CDF-11`) |
| Name (≤ 50) / Description (≤ 200) | |
| HasAccessControl | true / false — why (`CSC-09`) |
| Purge | PurgeTypeId · DaysToPurgeCase · DaysToPurgeProcess (< 0 never, 0 default, > 0 days) (`CSL-09`) |
| Setup action used | from the inventory, non-deprecated (`CDF-09`) |

## 1. Purpose and volumes
What the case is, who starts it, expected cases per month, open cases at peak, retention.

## 2. Groups
| Key | Business meaning | OutSystems role mapped (`CSC-05`) | Membership source |
|---|---|---|---|
| Reviewers | | `RequestReviewer` | admin screen / AD group |

## 3. Statuses
| Key | GUID | Name (en / ar, ≤ 50) | Alias (≤ 50) | Initial | Terminal | IsActive | Status SLA | Who sees it |
|---|---|---|---|---|---|---|---|---|

## 4. Activities
| Key | GUID | Human/Auto | Group | Actions | SLA target / calendar | Escalate to | FE screen (routing table) |
|---|---|---|---|---|---|---|---|

## 5. Actions
| Key | GUID | Label (en / ar) | Kind (positive/negative/neutral) | Comment required | Confirmation |
|---|---|---|---|---|---|

## 6. State machine
Diagram (text or image), then the transition table:
| From | To | Trigger (activity + action / `system:<Reason>`) | Mechanism (`Case_CloseActivity` with Status / `Case_UpdateStatus`) | Condition / rule | Who |
|---|---|---|---|---|---|
Every row is registered as a CMF state-machine pair (`CST-09`); the wrapper passes `To` explicitly (`CST-08`).

## 7. Rules
| Name | Type (logical / group / user / status) | Meaning | Used by |
|---|---|---|---|

## 8. SLAs, calendars, escalation
End-to-end SLA, per-status, per-activity; calendar; pauses; reminders; escalation; auto-transitions.

## 9. Notifications
| Event | Template | Recipients | Channel | Language rule | Internal/external |
|---|---|---|---|---|---|

## 10. Access
Who can see / act / supervise / administer; instance grants and revokes per transition (`CSC-04`); external applicant view.

## 11. Subcases, linked cases, milestones

## 12. Change log and running-instance plan (`COP-04`)
| Version | Change | Running instances | Migration | Approved by |
|---|---|---|---|---|

## 13. Test matrix (`COP-07`)
Every transition × role: allowed and not allowed. Plus: a move not in the state machine, return-and-resubmit, SLA breach, due date starting on a holiday, delegation, pickup/takeover/release/block, concurrent action, bootstrap re-run and Ready check, anonymous call rejected.


## Evidence and acceptance

- Platform/app type, installed versions/theme where relevant, target environment:
- Existing project decisions and authorized delivery scope:
- Requirement → element/contract → source of data → verification evidence:
- Concurrency, retry/unknown outcome, authorization and failure cases relevant to this change:
- Delivery status: prepared / model validated / merged / published / runtime verified (record only observed stages):
- Not tested, missing dependency or blocked evidence, and the exact next step:
