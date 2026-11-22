# Contributing

Thanks for helping improve **outsystems-cmf**. This repository is an agent skill: Markdown that AI agents (and people) read to design, build and review OutSystems 11 case-management apps on the Case Management Framework (CMF). Every change must stay **accurate, sourced, version-aware, agent-independent and concise**.

## Ways to contribute
- **Propose a rule**: open a "Rule proposal" issue with the problem, the rule, the severity and a source.
- **Report a wrong or outdated fact**: open a "Bug / inaccuracy" issue with the CMF version and a link that contradicts it.
- **Confirm an unverified item**: `research/sources.md` lists what is still unverified (e.g. `CaseServices_API` signatures, SLA pause/resume). Evidence from an installed CMF version is very welcome.
- **Add a lesson learned**: a real mistake, written as *problem → cause → rule*, with no client or personal details.
- **Improve tooling**: the case-definition validator, the consistency checker, or CI.

## Content rules
1. **Cite sources** in `research/sources.md` with a confidence level: **Official** (OutSystems docs, Forge release notes), **Staff/MVP** (forum answers by OutSystems staff or MVPs), **Community**. Official wins on conflict; record the conflict.
2. **Be version-aware.** CMF behaviour changes between versions (see the version table in `references/operations-and-deployment.md`). State the version a fact applies to.
3. **Never invent CMF API names.** Add an action to `references/cmf-api-map.md` only with a source or a screenshot-free description from an installed version, and mark it ✔ (documented) or ◐ (forum/partial).
4. **Paraphrase, don't copy.** Short quotes only.
5. **No confidential data.** No client names, internal hostnames, credentials, personal data, or GUIDs copied from real systems. Use neutral names (`Request_CS`, `Complaint`, `Reviewers`) and freshly generated GUIDs.
6. **Explain the reason.** One sentence of *why* beats an all-caps MUST.
7. **Agent-independent.** Plain Markdown and zero-dependency Node scripts. Agent-specific text only in `adapters/`.
8. **Keep `SKILL.md` under ~200 lines.** Details go into `references/`.

## Rule IDs
- Enforceable rules live in `references/review-checklist.md` as `| ID | Severity | Rule |`; lessons in `references/lessons-learned.md` as `| \`CLL-nn\` |`.
- Groups: `CAR`, `CDF`, `CST`, `CAC`, `CSC`, `CSL`, `CUI`, `COP`, `CLL`.
- **IDs are stable.** Never renumber or reuse; new rules take the next free number; retired rules stay, marked *Deprecated*.
- Rules from companion skills (`ARC`, `HSE`, `BLG`, `BTX`, `PAR`, `PHA`…) are cited, not redefined. `check_skill.mjs` cross-checks BPT IDs when `outsystems-bpt` sits next to this folder.
- Severity: **Blocker** (security, status/data corruption, blocked deployment or upgrade), **Major** (architecture or real operational cost), **Minor** (convention).

## Validator changes
- `scripts/check_case_definition.mjs` must stay dependency-free (Node 16+).
- Every new check gets a case in `scripts/examples/bad-definition.json` and an expectation in `scripts/test_validator.mjs`; `good-definition.json` must stay clean (0 errors, 0 warnings).

## Before you open a pull request
```
node scripts/check_skill.mjs        # frontmatter, links, rule IDs, adapters, hygiene
node scripts/test_validator.mjs     # validator regression
```
- Update `CHANGELOG.md`. Bump `metadata.version` in `SKILL.md` for releases (semantic versioning: new rules = minor, wording fixes = patch, changed meaning of an existing ID = major).
- If you change the core rules block in `adapters/AGENTS.md`, copy it to `adapters/copilot-instructions.md` (the checker compares them).

## Reliability review guidance

Use `CRV` for verification and reliability review rules. These are manual acceptance checks unless a script explicitly implements them. Keep platform facts, house conventions and observed project lessons distinct, and link primary sources from `references/verification-and-reliability.md`.

Verify wrapper names against the installed CMF API. Static definition checks do not prove effective permissions, implicit commits or runtime recovery; record that evidence separately.

Run repository maintenance checks from a full Git checkout. Release archives intentionally exclude these scripts; installed skill packages still include the runtime validators.

## Code of conduct
By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
