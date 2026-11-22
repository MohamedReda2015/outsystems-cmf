# Security and access for CMF apps

Rules: `CSC-01` … `CSC-10`. Builds on the architecture skill's `SEC-*` and the backend skill's `BSC-*`. Never relaxed by precedence.

## Threat model
Every inbox query, case read and action submit triggered by the Reactive client is a public REST endpoint. A user can call it with any `CaseId`, `ActivityId` or action key. **CMF access control** decides who can see and write a case; the **house BL wrapper** decides whether *this* user may do *this* thing to *this* record now. Both must say yes.

## How CMF access control works (official docs + staff answers)
- Two levels: **Read** and **Write**. Access is denied unless granted.
- Checked **only if the case definition has `HasAccessControl = True`**. With it off, any registered user passes CMF's check — your BL is then the only guard.
- Grants exist at **definition** level and **instance** level; CMF uses the **highest** of the two (Write > Read). Lowering an instance to Read does not remove a definition-level Write.
- `Case_UpdateGroupAccess` changes **instance** rights only (raises if used for definition rights); `CaseDefinition_UpdateGroupAccess` changes **definition** rights.
- Single-case actions without permission **raise**; list actions **silently omit** inaccessible cases.
- Since 1.5.2, service actions that fetch case/activity data raise unless the caller is a **registered user** (no anonymous access).
- Activity level: `Activity_CheckUserAccess` (Boolean) / `Activity_ValidateUserAccess` (raises), both delegation-aware.

## Rules
| ID | Rule |
|---|---|
| `CSC-01` | Every BL wrapper checks, on the server: (1) the OutSystems role for the use case, (2) CMF access (instance/activity), (3) business ownership/assignment. Any "no" → `NotAuthorizedException`, logged. |
| `CSC-02` | Ids from the client are claims: reload the case (Id = CaseId), confirm the activity belongs to it, is active (`Case_CheckActivityIsActive`) and not blocked by someone else (`Activity_CheckIsBlocked`). |
| `CSC-03` | The action key must be in the allowed list re-computed on the server (`CAC-02`). Hidden buttons are visibility only (`FSC-02`). |
| `CSC-04` | Instance grants/revokes (`Case_UpdateGroupAccess`) happen in the same wrapper that changes who works the case. Closed cases keep read access for participants and auditors only. |
| `CSC-05` | One mapping between CMF groups and OutSystems roles, in BL, used by assignment and authorization. |
| `CSC-06` | Inbox/search: use CMF list actions (which filter by access) or server-side queries that filter by access; paged and bounded. Never filter a full list on the client. |
| `CSC-07` | Documents and notes served through access-checked server actions; uploads scanned before linking. |
| `CSC-08` | Identity from `GetUserId()`; delegation resolved on the server (`Activity_CheckUserAccess` covers it). |
| `CSC-09` | Definitions holding restricted data set `HasAccessControl = True` and define definition-level grants as the **minimum** (usually Read for supervisors/auditors at most); per-case Write is granted at instance level. Use the right action per level; remember highest-wins. |
| `CSC-10` | The adapter maps CMF permission exceptions to `NotAuthorizedException`; empty lists from CMF list actions are treated as "nothing visible", not as an error. External/anonymous applicants act through a registered account or a BL service path that never exposes CMF reads to anonymous users. |

## The check, as code shape
```
Request_CheckAccess (private, BL/CaseManagement/Request) → raises NotAuthorizedException
  in: RequestId (= CaseId), UseCase (Read | ActOnActivity | Supervise | Administer), ActivityId?
  1. Role check for UseCase (CheckRequestReviewer…)
  2. Request = Request_Get(RequestId) (not deleted)                  → NotFoundException
  3. Read: rely on CMF single-case read (raises) or ownership rule for applicants
  4. ActOnActivity: Case_CheckActivityIsActive, Activity_CheckIsBlocked (by another user),
     Activity_ValidateUserAccess (assignee / group / delegation)
  5. Business ownership rules (applicant: own requests; reviewer: their groups)
```
Tests: another user's case, inactive activity, blocked activity, action not allowed, expired delegation, removed group membership, definition with `HasAccessControl` off, anonymous call.

## Sensitive data
- Timeline comments may hold personal data: same access as the case; internal comments hidden from external users.
- No personal data in case titles shown in shared group inboxes.
- Emails carry a link and minimal data (`Email_ProcessPlaceholders` only with safe placeholders).
- Audit views of sensitive cases when the domain requires it (Audit_Lib).

## Administration
Definition admin (groups, calendars, SLAs, definition-level access, delegations for others) is a separate role (`CaseAdministrator`), its own FE flow or BackOffice app, audited.
