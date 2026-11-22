#!/usr/bin/env node
// Regression test for check_case_definition.mjs. Run: node scripts/test_validator.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const run = (f) => {
  try {
    return JSON.parse(execFileSync(process.execPath, [join(here, 'check_case_definition.mjs'), join(here, 'examples', f), '--json'], { encoding: 'utf8' }));
  } catch (e) {
    return JSON.parse(e.stdout);
  }
};

let failed = 0;
const expect = (cond, msg) => { if (!cond) { failed++; console.error('FAIL', msg); } else console.log('ok  ', msg); };

const good = run('good-definition.json');
expect(good.errors === 0 && good.warnings === 0, 'good definition is clean');

const bad = run('bad-definition.json');
const rules = new Set(bad.findings.filter(f => f.severity === 'error').map(f => f.rule));
for (const r of ['CDF-02', 'CDF-06', 'CDF-10', 'CDF-11', 'CAC-01', 'CAC-02', 'CAC-06', 'CSL-01', 'CST-03', 'CST-04']) {
  expect(rules.has(r), `bad definition reports ${r}`);
}
expect(bad.errors === 13, `bad definition has 13 errors (got ${bad.errors})`);
const warnRules = new Set(bad.findings.filter(f => f.severity === 'warning').map(f => f.rule));
for (const r of ['CSC-09', 'CSL-09']) expect(warnRules.has(r), `bad definition warns ${r}`);

process.exit(failed ? 1 : 0);
