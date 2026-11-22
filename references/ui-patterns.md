# UI patterns for CMF apps

Rules: `CUI-01` … `CUI-09`. Frontend rules (`FET-*`, `CLG-*`, `ERR-*`, `BLK-*`) from outsystems-frontend-conventions; the look from outsystems-live-style-guide. The client never calls CMF: every block reads through BL wrappers.

## Screens and blocks
| Screen (FE) | Composed of (CW blocks) | Data (BL wrapper → CMF) |
|---|---|---|
| `CaseInbox` | `CaseInboxTabs`, `CaseInboxFilters`, `CaseInboxList` | `RequestCase_GetInbox` → `Case_GetActivities` / `Case_GetCasesByActivity`; counts → `Case_GetCasesByActivityCounters` |
| `RequestDetail` | `RequestCaseHeader`, `CaseActionBar`, tabs: summary, `CaseActivityList`, `CaseTimeline`, `CaseNotes`, `CaseDocuments`, `CaseSubcases` | `RequestCase_GetDetail` → `Case_GetDetailsByCaseId`; actions; `Case_GetActivitiesTimeline`; `Case_GetAllSubcases` |
| Activity screens (`ReviewRequest`, `ProvideMissingInfo`) | activity form block + `CaseActionBar` | `RequestCase_GetActivity` |
| `MyDelegations`, `CaseAdministration` | admin blocks | admin wrappers |

## Rules
| ID | Rule |
|---|---|
| `CUI-01` | **Inbox** tabs: *My tasks* (AssignToMe), *My groups* (AssignedToAnyone within my groups), *Assigned to others* (supervisors), *Delegated to me*, *Overdue*, *My requests* (applicant). Server-side filter/sort/paging; SLA badge with text; filters kept on return (`NAV-03`). |
| `CUI-02` | **Case detail**: header at start; tabs **on demand** (`FET-01`). |
| `CUI-03` | **Action bar** from server `CaseActionOption` list: comment popup, confirmation for destructive actions, one wrapper call, `IsSubmitting` guard (`CLG-01`, `CLG-03`). After success refresh header + actions + counts, or go back to the inbox. With `Case_CloseActivityAsync`, show "processing" and refresh shortly after. |
| `CUI-04` | **Routing**: activity key → screen through the FE routing table; unknown keys open the generic detail and log a warning. No URL strings (`NAV-01`). |
| `CUI-05` | **Collaboration feedback**: "taken by X", "blocked by X", "already closed" (`ConflictException`) explained and refreshed; Take / Release / Block buttons from server state. |
| `CUI-06` | **Timeline**: newest first, paged, grouped by day, icon + text per event, internal comments hidden for externals. |
| `CUI-07` | Status/priority/SLA as text + icon + color; labels from the server in the user's language; RTL tested. |
| `CUI-08` | Generic case blocks take ids and raise events (block contract); type-specific content in placeholders. |
| `CUI-09` | **Know the CMF list semantics**: since 1.5.1 `Case_GetActivities` with *MyActivities* returns all activities in the user's groups regardless of assignee — filter with `ActivityAssignementStatusId` (AssignToMe / AssignedToAnyone / AssignedToOthers) to build tabs; list actions silently omit cases without access; tab counts from `Case_GetCasesByActivityCounters` in one call. |

## Action submit, end to end
```
CaseActionBar → OnActionSelected(ActionKey)
RequestDetail.ActionBarOnActionSelected:
  if IsSubmitting → end
  NeedsComment → CommentPopup → OnConfirmed(Comment)
  NeedsConfirmation → confirm naming the case and the action
  IsSubmitting = True
  Result = Request_ExecuteAction(RequestId, ActivityId, ActionKey, Comment)   ← ONE BL call
  IsSubmitting = False
  Result.IsSuccess ? feedback + refresh/navigate : map Errors to UI (ConflictException → CUI-05)
OnException: friendly message, log (ERR-01)
```

## Performance
- One CMF list call per page through BL; never one CMF call per row (`BPF-01`, `CLL-11`). Business columns not in CMF's list output come from one join/aggregate over the page's ids.
- Counts refreshed after actions, not by browser polling.
