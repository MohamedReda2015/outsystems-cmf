# OutSystems CMF (Case Management Framework) skill

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![OutSystems 11](https://img.shields.io/badge/OutSystems-11-red)
![CMF 1.5.x](https://img.shields.io/badge/CMF-1.5.x-orange)
![Agent independent](https://img.shields.io/badge/agents-Claude%20%7C%20Copilot%20%7C%20Cursor%20%7C%20Codex%20%7C%20any-6f42c1)

**An agent skill that teaches AI coding agents, and people, to design, build, secure, operate and review OutSystems 11 case-management apps on the [Case Management Framework](https://www.outsystems.com/forge/component-overview/9179/case-management-framework-o11) the way a senior OutSystems architect would.**

It places CMF on the official 3-layer **Architecture Canvas** and a strict **Front_End → CW → BL → CS** module chain, wraps the CMF APIs behind one BL anti-corruption layer, and turns what the official docs, Forge release notes and staff/MVP forum answers say into enforceable rules with stable IDs, a case-definition validator, templates and lessons learned.

Plain Markdown plus zero-dependency Node.js scripts, so it works with Claude (Code, Desktop, API), GitHub Copilot, Cursor, Codex, Gemini CLI, Aider or your own LLM agents.

---

## Contents
- [Why this skill](#why-this-skill)
- [What you get](#what-you-get)
- [Install](#install)
- [Use it](#use-it)
- [Repository layout](#repository-layout)
- [Case-definition validator](#case-definition-validator)
- [Rule IDs and severities](#rule-ids-and-severities)
- [Companion skills](#companion-skills)
- [Versioning and releases](#versioning-and-releases)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [License](#license)

## Why this skill
CMF saves months on case management, but teams keep hitting the same walls. These are the most expensive ones the skill prevents:

| Surprise | What the skill makes the agent do |
|---|---|
| "Status is not valid for the status set" after adding a status | Treat static entities as the *source*, re-run and **verify** the bootstrap, check GUIDs and state-machine pairs |
| The state machine doesn't move the case | Know CMF never changes status by itself; pass the target status explicitly |
| Writes after closing an activity can't roll back | Know `Case_CloseActivity` commits; validate and write first, close last |
| Lowering a case to Read doesn't remove Write | Understand definition vs instance grants (highest wins) |
| CW blocks calling CMF directly, approve buttons trusted on the client | One BL wrapper; allowed actions recomputed and checked on the server |
| Inbox tabs change after an upgrade; due dates wrong on holidays | Version-aware inbox semantics; calendar tests per version |

## What you get
| Area | Highlights |
|---|---|
| Architecture | When to use CMF; CMF as a shared Core framework app; only BL calls CMF; official tutorial / App Starter mapped to the house chain |
| Definitions | Configuration as code: `CaseDefinitionConfiguration`, `CaseStatusConfiguration`, GUIDs, "When Published" bootstrap with `SetupData`, Ready check, limits, multilingual, purge |
| Lifecycle | State-machine pairs, explicit status changes, one mechanism per transition, close-last transaction order, `Case_Complete` |
| Activities | Group assignment, pickup / takeover / release / block / skip wrappers, allowed actions, comments, multiple-instance activities |
| Security | CMF access control (definition vs instance, Read/Write), house role + ownership checks, registered-user requirement |
| SLA and more | Calendars, escalation, due-date testing, delegation, notifications after commit, timeline, retention |
| UI | Inbox tabs from CMF list semantics, case detail, action bar, conflict feedback |
| Operations | Deploy order, CMF upgrades, version-bug table (1.5.1–1.5.3), running-instance plans, diagnosis runbook, testing |
| Tooling | `check_case_definition.mjs` validator, CMF API map with verification marks, spec and review templates, evals |

## Install
The repository root **is** the skill: `SKILL.md` sits at the top level.

**Claude Code** (all projects):
```bash
git clone https://github.com/MohamedReda2015/outsystems-cmf ~/.claude/skills/outsystems-cmf
```
```powershell
git clone https://github.com/MohamedReda2015/outsystems-cmf "$HOME\.claude\skills\outsystems-cmf"
```
For one project only, clone it into `<repo>/.claude/skills/outsystems-cmf`. The skill triggers automatically from its description.

**Claude.ai / Claude Desktop**: download `outsystems-cmf-vX.Y.Z.zip` from [Releases](https://github.com/MohamedReda2015/outsystems-cmf/releases) and upload it under *Settings → Capabilities → Skills*.

**Claude API / Agent SDK**: upload it as a custom Skill, or put `SKILL.md` in the system prompt and give the agent read access to `references/`.

**Codex, Gemini CLI, Aider, Jules and other AGENTS.md readers**: add the repo as a folder or submodule and copy [`adapters/AGENTS.md`](adapters/AGENTS.md) into your repository's AGENTS.md.

**GitHub Copilot**: copy [`adapters/copilot-instructions.md`](adapters/copilot-instructions.md) to `.github/copilot-instructions.md`.

**Cursor**: copy [`adapters/cursor/outsystems-cmf.mdc`](adapters/cursor/outsystems-cmf.mdc) to `.cursor/rules/`.

**Chat assistants without file tools** (Claude Projects, custom GPTs, Gemini Gems): paste [`adapters/claude-project-instructions.md`](adapters/claude-project-instructions.md) into the instructions and upload `SKILL.md` + `references/` as knowledge.

## Use it
Ask in your own words; the agent loads only the references it needs:
- *"Design a permit-application case type on CMF: submit, review with return-for-info, approve or reject, Arabic and English."*
- *"Our case throws 'Status is not valid for the status set' when moving to PendingInfo. What should I check?"*
- *"Review this module: the CW inbox block calls CaseServices_API and Approve is shown when Status = UnderReview."*
- *"We need to remove a status from a live case type with 300 open cases."*

Typical flow: **Step 0** (is CMF right? versions, inventory of the installed CMF API) → **spec** (`templates/case-definition-spec.md`) → **validate** → build bottom-up CS → BL → process → CW → FE → **verify every transition in the running app** → review with `references/review-checklist.md`.

## Repository layout
```
SKILL.md                         entry point (read first)
references/
  architecture-and-modules.md    when to use CMF, placement, wrapper, naming, folders
  cmf-api-map.md                 CMF actions, permissions, setup structures (✔ documented / ◐ forum)
  case-definition-and-configuration.md
  lifecycle-status-and-activities.md
  security-and-access.md
  sla-delegation-notifications.md
  ui-patterns.md
  operations-and-deployment.md   deploy, upgrades, version bugs, App Starter, runbook, testing, ODC
  lessons-learned.md             CLL-01…27 (public vs project)
  review-checklist.md            all rule IDs with severity
templates/                       case-definition-spec.md · cmf-review-report.md
scripts/
  check_case_definition.mjs      definition validator (Node 16+, no packages)
  examples/                      good and bad definitions
  test_validator.mjs             regression test
  check_skill.mjs                repo consistency checker
adapters/                        AGENTS.md · copilot-instructions.md · cursor/ · claude-project-instructions.md
evals/evals.json                 prompts + expectations to test any agent with the skill
research/                        sources.md (confidence levels) · assessment-2026-11.md
```

## Case-definition validator
```bash
node scripts/check_case_definition.mjs scripts/examples/good-definition.json
node scripts/check_case_definition.mjs scripts/examples/bad-definition.json --json
```
Checks GUID format and uniqueness, one active initial status, terminal statuses without exits, reachability and dead ends, transitions vs actions vs activities, group assignment, SLAs and escalation, comments on rejecting actions, translations, CMF length limits (Name/Alias ≤ 50, Description ≤ 200), mixed transition mechanisms, explicit access-control and purge settings, and one definition per CS module. Exit code `1` on errors, so it fits CI. The input format is documented in the script header.

## Rule IDs and severities
| Prefix | Area | Prefix | Area |
|---|---|---|---|
| `CAR` | Architecture and wrapper | `CSC` | Security and access |
| `CDF` | Definitions and configuration | `CSL` | SLA, delegation, notifications, retention |
| `CST` | Statuses and state machine | `CUI` | UI patterns |
| `CAC` | Activities and actions | `COP` | Operations, upgrades, testing |
| `CLL` | Lessons learned | | |

**Blocker** = security hole, status/data corruption or blocked deployment/upgrade · **Major** = architecture or real operational cost · **Minor** = convention. IDs are stable and never renumbered.

## Companion skills
This skill cites, and is designed to sit next to:
- [outsystems-architecture](https://github.com/MohamedReda2015/outsystems-architecture) — layers, modules, dependencies, SOPs (`ARC`, `HSE`, `SEC`…)
- [outsystems-live-style-guide](https://github.com/MohamedReda2015/outsystems-live-style-guide) — look and feel, accessibility
- outsystems-backend-conventions, outsystems-frontend-conventions, outsystems-bpt — BL code, screens, processes (`BLG`, `FET`, `PAR`…)

It works on its own; the companions add the detail behind the cited IDs.

## Versioning and releases
Semantic versioning in `SKILL.md` (`metadata.version`) and [`CHANGELOG.md`](CHANGELOG.md): new rules = minor, wording fixes = patch, changed meaning of an existing ID = major. Each release tag `vX.Y.Z` matches `SKILL.md` and has `outsystems-cmf-vX.Y.Z.zip` (built with `git archive`, repository plumbing excluded) attached on the [Releases](https://github.com/MohamedReda2015/outsystems-cmf/releases) page.

## Contributing
Corrections with evidence from an installed CMF version are especially welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and the unverified list in [`research/sources.md`](research/sources.md). Run `node scripts/check_skill.mjs` and `node scripts/test_validator.mjs` before a pull request.

## Disclaimer
Not affiliated with, endorsed by, or sponsored by OutSystems. "OutSystems" and related names are trademarks of OutSystems. CMF behaviour differs between versions and some API details could not be verified from public documentation: always check action names and signatures against the CMF modules installed in your environment. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License
[MIT](LICENSE)
