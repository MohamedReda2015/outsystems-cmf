# SLAs, delegation, notifications, audit, retention

Rules: `CSL-01` … `CSL-10`. API names: `references/cmf-api-map.md`.

## 1. SLAs and calendars (`CSL-01`, `CSL-05`, `CSL-06`, `CSL-10`)
- Use **CMF SLA management with calendars** (configured per process and activity; `CaseProcessConfigurations_API`). Calendars, holidays and non-working days come from `Calendar_*`, `Holiday_*`, `NonWorkingDay_*`.
- Define SLAs where the business measures them: end-to-end, per status, per human activity; each with its calendar in the spec.
- Due dates are computed **on the server** (`Activity_CalculateAndSetDueDate`, `Activity_CalculateExecutionTime`) and returned in BL Structures (`DueOn`, `SlaState = OnTrack | AtRisk | Breached`); the UI only displays them (`CSL-01`).
- Every SLA has an **escalation** (`CSL-05`): reminder → supervisor group at breach → optional `system:SlaExpired` transition, from timers or process waits.
- **Pauses** (case waiting for the applicant) are modeled explicitly; CMF SLA pause/resume has open community questions — verify how your version supports it before promising it (`CSL-06`).
- **Test due dates with real calendars on your version** (`CSL-10`): 1.5.2 fixed `Calendar_GetEndDate` returning null when the start date is a non-working day and wrong due dates from `Activity_CalculateAndSetDueDate`; a 2024 forum thread still reports calendar due-date problems (`CLL-24`). Test: start on a weekend/holiday, cross-year, time zones.
- Load next year's holidays before year end (operations checklist, `CLL-13`).
- On Oracle, SLA overdue events didn't fire before 1.5.1.

## 2. Delegation and absences (`CSL-02`)
- CMF delegation and absence periods (`Delegation_*`). A delegate sees and acts on the delegator's activities for the period; CMF access checks (`Activity_CheckUserAccess`) include delegation; takeover allows "delegation from a same-group user".
- No custom `ActingUserId` columns or client flags.
- Group + user delegation contexts failed in some cases before 1.5.2 — be on 1.5.2+.
- Supervisors setting delegation for absent users is an admin use case with audit.

## 3. Notifications (`CSL-03`, `CSL-07`)
- Events, templates and recipients are listed in the spec.
- CMF email templates (`EmailTemplate_*`, placeholders resolved by `Email_ProcessPlaceholders`) or the backend outbox. Either way, **send after commit**: never call a gateway inside the activity transaction (`CSL-03`, `BTX-06`).
- Recipients resolved from groups and delegation at send time; multilingual templates; links through a configured base URL (`NAV-01`).
- External applicants get status-level information only (`CSL-07`).
- Non-production test override: a site property redirecting all notifications to a test address, empty in production.

## 4. Audit and timeline (`CSL-04`, `CSL-08`)
- **Case history = CMF process audit + history** (`Case_GetActivitiesTimeline`, `Case_GetHistory`, `Case_GetAllHistoryByIdAndDate`). Business data changes = house Audit_Lib (architecture skill `references/audit-trail.md` there). No third history table (`CSL-04`).
- Timeline through a BL read wrapper: role-filtered (internal vs external), localized, paged, fetched on demand (`CSL-08`).
- On versions before 1.5.3, group-assigned activities were missing from `Case_GetActivitiesTimeline` (`CLL-14`). A forum thread also asks how to see manual reassignments in `Case_GetHistory`: verify the events you need appear.

## 5. Retention and purge (`CSL-09`)
- Set `PurgeTypeId`, `DaysToPurgeCase`, `DaysToPurgeProcess` explicitly per definition (`< 0` never, `0` system default, `> 0` days).
- Align with legal retention and outsystems-bpt `POP-01`. Archive what must outlive CMF data into your own entities before purge.
- `CaseDefinition_GetEligibleToPurge` / `CaseDefinition_Purge` are admin operations: role-protected, audited, never from user requests.
