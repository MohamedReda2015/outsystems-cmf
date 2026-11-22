## What changes

<!-- One or two sentences. Link the issue if there is one. -->

## Type
- [ ] New rule(s) — IDs: <!-- e.g. the next free CAC number -->
- [ ] Correction of an existing rule or CMF fact — IDs:
- [ ] New lesson learned (`CLL-*`)
- [ ] CMF API map update (`references/cmf-api-map.md`)
- [ ] Tooling (validator, checker, CI)
- [ ] Documentation / adapters

## Checklist
- [ ] Sources added to `research/sources.md` with their confidence level (Official / Staff-MVP / Community)
- [ ] CMF version noted when the fact is version-specific
- [ ] Paraphrased, with no copied documentation text
- [ ] No client names, hostnames, credentials, real GUIDs from client systems or personal data
- [ ] Rule IDs are new or unchanged (never renumbered)
- [ ] `node scripts/check_skill.mjs` passes
- [ ] `node scripts/test_validator.mjs` passes (examples and expectations updated if the validator changed)
- [ ] If the core rules changed: `adapters/AGENTS.md` and `adapters/copilot-instructions.md` blocks are identical
- [ ] `CHANGELOG.md` updated
