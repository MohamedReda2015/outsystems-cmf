# CMF review: <App> — <date>

| Item | Value |
|---|---|
| Scope | modules / definitions reviewed |
| CMF version (per environment) | |
| Validator result | `check_case_definition.mjs`: N errors, M warnings |
| Reviewer | |

## Summary
Two or three sentences: overall health, the blockers, the recommended order of fixes.

## Findings (most severe first)
| # | Severity | Rule | Evidence (`Module.Folder.Element` / GUID) | Problem | Fix |
|---|---|---|---|---|---|
| 1 | Blocker | CSC-03 | `Request_BL.CaseManagement.Request.Request_Approve` | action key from client not re-checked | re-read allowed actions; reject if absent |

## Status integrity
Mirror writes found, transition mechanisms per transition, drift check result.

## Architecture
Dependencies on CMF modules by module; adapter coverage.

## Operations
Bootstrap idempotency, monitoring, upgrade readiness, running-instance plans.

## Not verified
What could not be checked and why.


## Evidence and acceptance

- Platform/app type, installed versions/theme where relevant, target environment:
- Existing project decisions and authorized delivery scope:
- Requirement → element/contract → source of data → verification evidence:
- Concurrency, retry/unknown outcome, authorization and failure cases relevant to this change:
- Delivery status: prepared / model validated / merged / published / runtime verified (record only observed stages):
- Not tested, missing dependency or blocked evidence, and the exact next step:

## Delivery trace and tested baseline

- Source revision/locator; requirement, story and criterion IDs:
- Target app/module version, environment, role, locale and data-provider mode:
- Expected versus observed result and evidence reference (including test time):
- Evidence stage: prepared / model validated / merged / published / runtime verified:
- Changed source/contracts since last test; affected checks to rerun:
- Outstanding dependent work, owner and next action; scope decisions:
