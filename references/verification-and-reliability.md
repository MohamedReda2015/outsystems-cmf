# CMF transaction boundaries and operational verification

Use with the installed CMF version and public API inventory. Framework internals remain untouched; the guidance here does not imply permission to modify a live case or deploy a framework upgrade.

## Commit inventory (CRV-01)

The official CaseServices_API reference reviewed on 2026-11-22 explicitly documents commits in more than the close action:

| Action | Documented behavior to account for |
|---|---|
| `Case_CloseActivity` | Attempts synchronous closure and performs a commit |
| `Activity_AssignToGroup` | Assigns a group, grants case access when configured, and commits |
| `Case_DiscardActivity` | Discards the activity through a BPT action that commits |
| `Case_CloseActivityAsync` | Requests asynchronous closure; final completion needs separate evidence |

This is not an exhaustive list or a promise about every installed release. Record the public description/signature and observed behavior of each called action. Absence of 'commit' from a short description is not proof of no commit. A remote Service Action wrapper also has its own transaction.

Before a commit-capable call: revalidate permissions, active case/activity, allowed outcome, reason and business invariants; perform the intended atomic business/history/outbox work. After it, do not expect an exception to undo earlier writes. Avoid multiple commit-capable operations hidden inside a supposed all-or-nothing wrapper. Test a failure immediately before and after each boundary.

## Synchronous versus asynchronous status (CRV-02)

For a synchronous close with a status mirror, prove both writes participate in the intended transaction up to the close boundary. Separate Service Actions or earlier commits invalidate that assumption.

For async close, preserve a distinction between **requested outcome/pending operation** and **confirmed CMF status**. Keep operation key, requested target, requester, timestamp and last reconciliation result. Reconcile through supported public APIs after success/failure; do not report the target status as confirmed before CMF accepted it. An already-completed retry returns the original outcome; a stale or conflicting retry returns a conflict.

## Configuration and access (CRV-03)

Bootstrap is versioned configuration with stable GUIDs. Validate twice-run idempotence, installed signatures, successful registration and effective state-machine pairs. Name/GUID presence in a static entity does not establish that the framework registered it. Preserve old statuses needed by live cases; define migration, rollback and compatibility explicitly.

CMF access checks complement domain authorization. Validate case/activity association and the current group/delegation at submission. Reassignment may broaden effective grants; review definition-level grants before expecting a narrower instance grant to restrict access. Delegation needs an expiry and audit context; it must not turn an arbitrary client-supplied user id into trusted identity.

Allowed action options drive UI availability and required fields, while the server recomputes the same policy on submit. Include supervisor reassignment, release/force-release and read-only views in this matrix. A general CanEdit flag must not disable a reason field for an otherwise permitted supervisory action.

## Recovery and regression (CRV-04)

Use supported APIs and an operator-readable reconciliation queue for mirror drift, pending async closure, orphaned process association or missing configuration. Report differences before repair; retries use operation keys and current-state checks. Never repair protected framework tables directly.

Upgrade tests cover active/waiting cases, pending closes, group/delegated activities, timezone/holiday SLA boundaries, translations, history visibility and retention. Test no-access and over-broad grant cases, not only the happy path. Keep the installed release separate from the reviewed documentation baseline; 'latest' requires a fresh release check.

## Sources and provenance

- [Official CaseServices_API](https://github.com/OutSystems/docs-product/blob/master/src/building-apps/case-management-workflow/case-management-framework/ref/auto/CaseServices_API.final.md): action descriptions, commit boundaries and collaboration contracts. Check the installed component before use.
- [Official CMF API index](https://github.com/OutSystems/docs-product/blob/master/src/building-apps/case-management-workflow/case-management-framework/ref/intro.md).
- [Official transactions](https://github.com/OutSystems/docs-product/blob/master/src/ref/data/database/handling-transactions.md): commit/rollback scope; the async reconciliation model is engineering guidance derived from those boundaries.
- Anonymized prior-project evidence reviewed 2026-11-22: supervisory reason fields were incorrectly disabled and current-assignee IDs were missing from a consumer contract. These are reusable permission/contract checks, not evidence that a particular CMF release was tested.
