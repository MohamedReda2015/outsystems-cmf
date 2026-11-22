# Sources and verification status

Checked 2026-11-22 (v1.1.0 research pass). Re-verify on every CMF upgrade. Confidence: **Official** = OutSystems docs/release notes; **Staff/MVP** = forum answer by OutSystems staff or MVP; **Community** = other forum users or third-party blogs.

## Official
| Fact | Source |
|---|---|
| Forge component, stable 1.5.3, O11, extends BPT, Common Shared Services 1.11.0; release notes 1.5.1–1.5.3 (fixes listed in operations-and-deployment.md §6) | https://www.outsystems.com/forge/component-overview/9179/case-management-framework-o11 · https://www.outsystems.com/forge/component-versions/9179 |
| Documentation hub (state machine, rules, subcases, milestones, SLAs/calendars, delegation, groups, multilingual, access control, API references) | https://success.outsystems.com/Documentation/11/Developing_an_Application/Create_case_management_and_workflow_apps/Use_Case_Management_framework |
| Official app shape: `<Entity>_CS` (entity Id = Case Identifier, Expose Process Events), `CaseDefinitionConfiguration`, `CaseStatusConfiguration`, `<Entity>_Create` + `Case_Initialize`, `Bootstrap_CaseConfiguration` timer (When Published) → `SetupCaseManagementApplication(SetupData)`; `<app>_WF` with `Case_AssociateProcess`; one definition per CS module | https://success.outsystems.com/documentation/11/building_apps/create_case_management_and_workflow_apps/use_case_management_framework/create_a_case_management_app/ |
| App Starter shape (`CMAppStarter_CS/_WF/_UI`, `Timer_SetupApplication`, `Case_Complete` final step) | https://success.outsystems.com/documentation/11/building_apps/create_case_management_and_workflow_apps/use_case_management_framework/creating_a_case_management_app_with_app_starter/ |
| One initial status; initial used when `Case_Initialize` gets no status; `Case_UpdateStatus` validates status and state machine | https://success.outsystems.com/Documentation/Case_Management/Case_status |
| `Case_CloseActivity` synchronous, commits the transaction; `Case_CloseActivityAsync`; pickup/takeover/release/block rules; `Activity_CheckUserAccess` / `Activity_ValidateUserAccess`; multiple-instance activities | https://success.outsystems.com/Documentation/Case_Management/Activities |
| Read/Write permissions per action; single-case actions raise, list actions filter | https://success.outsystems.com/documentation/11/building_apps/create_case_management_and_workflow_apps/use_case_management_framework/managing_access_to_cases/permissions_and_case_management_framework_actions/ |
| `CaseConfigurations_API` index, `SetupData`, `Setup_CaseDefinition` / `Setup_CaseStatus` / `Setup_CaseStateMachine` fields, length limits, purge semantics, `DEPRECATED_SetupCaseManagementApplication` | https://success.outsystems.com/Documentation/11/Developing_an_Application/Create_case_management_and_workflow_apps/Use_Case_Management_framework/Case_Management_framework_reference/Case_Configurations_API |
| Sample app OutTracker | https://www.outsystems.com/forge/component-overview/9951/outtracker |

Note: several official pages were read through a summarizing fetch rather than verbatim (marked in `research/assessment-2026-11.md`); the `CaseServices_API` and `CaseProcessConfigurations_API` reference pages returned 404.

## Staff / MVP forum answers
| Fact | Source |
|---|---|
| CMF never updates status automatically; `Case_GetAllPossibleStatus` for the UI; `Case_UpdateStatus`/`Case_CloseActivity` validate; `Case_CloseActivity` without Status leaves status unchanged; exceptions bubble up (Staff) | https://www.outsystems.com/forums/discussion/68860/how-to-build-case-state-machine-and-use-properly |
| Access control only if enabled on the definition; highest of definition/instance wins; `Case_UpdateGroupAccess` vs `CaseDefinition_UpdateGroupAccess` (Staff) | https://www.outsystems.com/forums/discussion/70100/access-control-in-case-definitions-vs-case-instances-case-management-framework |
| CMF validates `CaseStatus` in `CM_CaseDefinition_CS`, filled by the setup timer; re-run it (MVP) | https://www.outsystems.com/forums/discussion/85904/case-management-framework-case-closeactivity-status-is-not-valid-for-the-status/ |

## Community
| Fact | Source |
|---|---|
| "Status is not valid for the status set": wrong definition link, duplicated GUID | https://www.outsystems.com/forums/discussion/73624/ |
| `SetupCaseManagementApplication` deprecated; `BootstrapCaseConfiguration`, `CaseStatus_Bootstrap` | https://www.outsystems.com/forums/discussion/73136/case-management-framework-how-to-replace-deprecated-setupcasemanagementapplicat/ |
| Definition status 0 → Ready after a delay | https://www.outsystems.com/forums/discussion/71691/ |
| `Case_UpdateStatus` failing where `Case_CloseActivity` worked | https://www.outsystems.com/forums/discussion/76687/case-status-update/ |
| CMF modules protected; SLA configuration steps | https://www.outsystems.com/forums/discussion/94764/sla-configuration/ |
| Open topics 2024–2025: calendar due dates, SLA pause/resume, `Case_GetActivities` responses, reassignment in history, email placeholders | https://www.outsystems.com/forge/component-discussions/9179/case-management-framework-o11 |
| Three APIs described; Workflow Builder for simple apps, CMF for medium/complex | https://www.ranosys.com/blog/insights/digitizing-industry-process-with-outsystems-case-management-framework/ |
| No public GitHub source for CMF (modules protected) | search, 2026-11-22 |

## Not verified (read the installed modules)
- Full `CaseServices_API` and `CaseProcessConfigurations_API` signatures; SLA configuration actions; subcase creation actions; notification triggering.
- Whether `SetupCaseManagementApplication` or `BootstrapCaseConfiguration` is the recommended entry point in your version.
- SLA pause/resume support.
- Workflow Builder's current availability.

## House / experience (not official)
Everything with a rule ID (`CAR`, `CDF`, `CST`, `CAC`, `CSC`, `CSL`, `CUI`, `COP`) is house standard derived from the companion skills, the sources above and project practice; `CLL-*` marks which lessons are public vs project.


## Reliability review — 2026-11-22

See [verification and reliability](../references/verification-and-reliability.md) for primary sources, provenance and acceptance cases. Platform facts are separated from house policy and anonymized project observations. A community mirror is not an official publication; installed contracts and version-matched official sources take precedence. Runtime claims were not retested in a live tenant during this documentation review.

## Eight-skill delivery review — 2026-11-22

- Official: [OutSystems testing guidelines](https://success.outsystems.com/documentation/11/testing_apps/outsystems_testing_guidelines/); [develop for testability](https://success.outsystems.com/documentation/11/testing_apps/develop_for_testability/); [ODC UI testing](https://success.outsystems.com/documentation/outsystems_developer_cloud/testing_apps/web_ui_testing/).
- Standard: [Scrum Guide](https://scrumguides.org/scrum-guide.html); W3C [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [redundant entry](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html) and [accessible authentication](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html) where UI criteria apply.
- Engineering recommendations and generalized project observations: source/app baselines, historical identity, complete consumer imports, action-specific fields, mock/live consistency and honest blocked-work reporting. See `references/verification-and-reliability.md`; these recommendations are distinguished from platform facts.


## November 2026 cross-skill review (v1.2.0)
- OutSystems product updates: O11 MCP (read GA / write Beta), Traditional-to-Reactive conversion (GA), Performance Analytics for Reactive and Mobile (Beta, linked to Code Quality), OutSystems UI 3.0 (GA, 10 Nov 2026) — https://www.outsystems.com/product-updates
- OutSystems/outsystems11-mcp official skill (contract 2; design notes on edit sessions, timeouts, approvals) — https://github.com/OutSystems/outsystems11-mcp
- Generalized lessons from agent-driven O11 projects (Model API pitfalls, CSS deploy verification); no client details.
