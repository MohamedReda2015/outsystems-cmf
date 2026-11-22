#!/usr/bin/env node
// check_case_definition.mjs — validates an OutSystems CMF case-definition spec (JSON).
// Zero dependencies, Node 16+.
//
// Usage:
//   node scripts/check_case_definition.mjs <definition.json> [--json]
// Exit code: 0 = no errors (warnings allowed), 1 = errors found, 2 = bad input.
//
// Input format (see scripts/examples/good-definition.json):
// {
//   "specVersion": "1.0",
//   "languages": ["en", "ar"],
//   "definitions": [{
//     "key": "Request", "guid": "<uuid>", "version": "1.0", "module": "Request_CS",
//     "hasAccessControl": true, "purge": { "purgeTypeId": "...", "daysToPurgeCase": -1, "daysToPurgeProcess": 365 },
//     "labels": { "en": "Request", "ar": "..." }, "description": "...",
//     "groups":     [{ "key": "Reviewers" }],
//     "statuses":   [{ "key": "Draft", "guid": "<uuid>", "initial": true, "terminal": false,
//                      "alias": "Draft", "isActive": true, "labels": { "en": "Draft", "ar": "..." } }],
//     "actions":    [{ "key": "Approve", "guid": "<uuid>", "kind": "positive|negative|neutral",
//                      "needsComment": false, "needsConfirmation": true, "labels": {...} }],
//     "activities": [{ "key": "ReviewRequest", "guid": "<uuid>", "type": "human|automatic",
//                      "assignTo": { "group": "Reviewers" }, "actions": ["Approve"],
//                      "sla": { "target": "P3D", "calendar": "Default", "escalateTo": "Supervisors" },
//                      "labels": {...} }],
//     "transitions":[{ "from": "UnderReview", "to": "Approved",
//                      "trigger": { "activity": "ReviewRequest", "action": "Approve" } | { "system": "SlaExpired" },
//                      "mechanism": "activityAction|statusUpdate" }]
//   }]
// }
// Rule IDs refer to references/review-checklist.md.

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const file = args.find(a => !a.startsWith('--'));
if (!file) {
  console.error('Usage: node scripts/check_case_definition.mjs <definition.json> [--json]');
  process.exit(2);
}

let spec;
try {
  spec = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`Cannot read ${file}: ${e.message}`);
  process.exit(2);
}

const findings = [];
const add = (severity, rule, where, message) => findings.push({ severity, rule, where, message });
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const languages = Array.isArray(spec.languages) && spec.languages.length ? spec.languages : ['en'];
const seenGuids = new Map(); // guid -> where

function checkGuid(guid, where) {
  if (!guid) { add('error', 'CDF-02', where, 'missing GUID'); return; }
  if (!GUID.test(guid)) add('error', 'CDF-02', where, `malformed GUID "${guid}"`);
  if (/^0{8}-|(.)\1{7}-/.test(guid)) add('warning', 'CDF-02', where, `GUID "${guid}" looks hand-made; generate a random one`);
  const key = String(guid).toLowerCase();
  if (seenGuids.has(key)) add('error', 'CDF-02', where, `GUID duplicated (also used by ${seenGuids.get(key)}) — causes "Status is not valid for the status set"-type failures`);
  else seenGuids.set(key, where);
}
function checkKey(key, where) {
  if (!key) { add('error', 'CDF-07', where, 'missing key'); return; }
  if (!PASCAL.test(key)) add('warning', 'CDF-07', where, `key "${key}" is not PascalCase`);
}
function checkLabels(obj, where) {
  if (!obj.labels) { add('error', 'CDF-06', where, 'no labels'); return; }
  for (const lang of languages) {
    if (!obj.labels[lang] || !String(obj.labels[lang]).trim()) add('error', 'CDF-06', where, `missing "${lang}" label`);
  }
}
function uniqueKeys(list, kind, defWhere) {
  const seen = new Set();
  for (const x of list) {
    if (seen.has(x.key)) add('error', 'CDF-07', `${defWhere}.${kind}.${x.key}`, `duplicate ${kind} key`);
    seen.add(x.key);
  }
}

if (!Array.isArray(spec.definitions) || spec.definitions.length === 0) {
  add('error', 'CDF-07', file, 'no "definitions" array');
}

const inactive = (x) => x.deprecated === true || x.isActive === false;
function checkLength(text, max, rule, where, what) {
  if (typeof text === 'string' && text.length > max) add('error', rule, where, `${what} is ${text.length} chars (CMF limit ${max})`);
}
const modules = new Map();

for (const def of spec.definitions || []) {
  const D = `Definition.${def.key || '?'}`;
  checkKey(def.key, D);
  checkGuid(def.guid, D);
  if (!def.version) add('warning', 'CDF-07', D, 'no version: version the spec');
  for (const lang of languages) checkLength(def.labels && def.labels[lang], 50, 'CDF-10', D, `name (${lang})`);
  checkLength(def.description, 200, 'CDF-10', D, 'description');
  if (!def.module) add('warning', 'CDF-11', D, 'no "module": name the CS module that owns the definition');
  else if (modules.has(def.module)) add('error', 'CDF-11', D, `module "${def.module}" already owns definition ${modules.get(def.module)}: one case definition per CS module`);
  else modules.set(def.module, def.key);
  if (typeof def.hasAccessControl !== 'boolean') add('warning', 'CSC-09', D, 'hasAccessControl not set explicitly (true for restricted data)');
  const purge = def.purge;
  if (!purge) add('warning', 'CSL-09', D, 'no purge settings (purgeTypeId, daysToPurgeCase, daysToPurgeProcess)');
  else for (const k of ['daysToPurgeCase', 'daysToPurgeProcess']) {
    if (!Number.isInteger(purge[k])) add('error', 'CSL-09', D, `purge.${k} must be an integer (<0 never, 0 system default, >0 days)`);
  }

  const statuses = def.statuses || [];
  const actions = def.actions || [];
  const activities = def.activities || [];
  const transitions = def.transitions || [];
  const groups = new Set((def.groups || []).map(g => g.key));
  uniqueKeys(statuses, 'Status', D);
  uniqueKeys(actions, 'Action', D);
  uniqueKeys(activities, 'Activity', D);

  const statusByKey = new Map(statuses.map(s => [s.key, s]));
  const actionByKey = new Map(actions.map(a => [a.key, a]));
  const activityByKey = new Map(activities.map(a => [a.key, a]));

  // Statuses
  if (statuses.length === 0) add('error', 'CST-03', D, 'no statuses');
  if (statuses.length > 12) add('warning', 'CST-03', D, `${statuses.length} statuses: keep 5–10; model work as activities`);
  for (const s of statuses) {
    const W = `${D}.Status.${s.key}`;
    checkKey(s.key, W); checkGuid(s.guid, W); checkLabels(s, W);
    for (const lang of languages) checkLength(s.labels && s.labels[lang], 50, 'CDF-10', W, `name (${lang})`);
    checkLength(s.alias, 50, 'CDF-10', W, 'alias');
    if (s.initial && inactive(s)) add('error', 'CST-03', W, 'initial status is inactive');
  }
  const initials = statuses.filter(s => s.initial && !inactive(s));
  if (initials.length !== 1) add('error', 'CST-03', D, `exactly one initial status required, found ${initials.length}`);
  const terminals = statuses.filter(s => s.terminal);
  if (statuses.length && terminals.length === 0) add('error', 'CST-03', D, 'no terminal status');

  // Actions
  for (const a of actions) {
    const W = `${D}.Action.${a.key}`;
    checkKey(a.key, W); checkGuid(a.guid, W); checkLabels(a, W);
    if (a.kind === 'negative' && !a.needsComment) add('error', 'CAC-06', W, 'rejecting/returning action must require a comment');
    if (a.kind === 'negative' && !a.needsConfirmation) add('warning', 'CUI-03', W, 'destructive action should ask for confirmation');
  }

  // Activities
  for (const act of activities) {
    const W = `${D}.Activity.${act.key}`;
    checkKey(act.key, W); checkGuid(act.guid, W);
    if (!['human', 'automatic'].includes(act.type)) add('error', 'CAC-01', W, 'type must be "human" or "automatic"');
    if (act.type === 'human') {
      checkLabels(act, W);
      const to = act.assignTo || {};
      if (to.user || to.userId) add('error', 'CAC-01', W, 'assigned to a named user: assign to a group');
      if (!to.group) add('error', 'CAC-01', W, 'human activity has no group assignment');
      else if (!groups.has(to.group)) add('error', 'CAC-01', W, `group "${to.group}" is not declared in groups`);
      if (!act.sla) add('error', 'CSL-01', W, 'human activity without SLA');
      else {
        if (!act.sla.target) add('error', 'CSL-01', W, 'SLA without target');
        if (!act.sla.calendar) add('warning', 'CSL-01', W, 'SLA without calendar: working days/holidays ignored');
        if (!act.sla.escalateTo) add('warning', 'CSL-05', W, 'SLA without escalation');
        else if (!groups.has(act.sla.escalateTo)) add('error', 'CSL-05', W, `escalation group "${act.sla.escalateTo}" not declared`);
      }
      if (!act.actions || act.actions.length === 0) add('error', 'CAC-02', W, 'human activity without actions');
    }
    for (const k of act.actions || []) {
      if (!actionByKey.has(k)) add('error', 'CAC-02', W, `action "${k}" not declared`);
    }
  }

  // Transitions
  const adj = new Map(statuses.map(s => [s.key, new Set()]));
  const mechByPair = new Map();
  const usedActions = new Set();
  transitions.forEach((t, i) => {
    const W = `${D}.Transition[${i}] ${t.from}→${t.to}`;
    const from = statusByKey.get(t.from), to = statusByKey.get(t.to);
    if (!from) add('error', 'CST-03', W, `unknown from-status "${t.from}"`);
    if (!to) add('error', 'CST-03', W, `unknown to-status "${t.to}"`);
    if (from && from.terminal) add('error', 'CST-03', W, `terminal status "${t.from}" has an outgoing transition`);
    if (to && inactive(to) && t.isActive !== false) add('error', 'CST-05', W, `active transition into inactive status "${t.to}"`);
    const trig = t.trigger || {};
    if (trig.action) {
      usedActions.add(trig.action);
      if (!actionByKey.has(trig.action)) add('error', 'CST-03', W, `unknown action "${trig.action}"`);
      if (!trig.activity) add('error', 'CST-03', W, 'action trigger without activity');
      else if (!activityByKey.has(trig.activity)) add('error', 'CST-03', W, `unknown activity "${trig.activity}"`);
      else if (!(activityByKey.get(trig.activity).actions || []).includes(trig.action))
        add('error', 'CAC-02', W, `action "${trig.action}" is not allowed on activity "${trig.activity}"`);
      if (t.mechanism && t.mechanism !== 'activityAction') add('error', 'CST-04', W, 'user action should use mechanism "activityAction"');
    } else if (trig.system) {
      if (!PASCAL.test(trig.system)) add('warning', 'CST-03', W, `system reason "${trig.system}" is not PascalCase`);
      if (t.mechanism && t.mechanism !== 'statusUpdate') add('error', 'CST-04', W, 'system transition should use mechanism "statusUpdate"');
    } else {
      add('error', 'CST-03', W, 'transition without trigger (action or system)');
    }
    if (!t.mechanism) add('warning', 'CST-04', W, 'mechanism not declared');
    const pair = `${t.from}->${t.to}`;
    const mech = t.mechanism || (trig.action ? 'activityAction' : 'statusUpdate');
    if (!mechByPair.has(pair)) mechByPair.set(pair, new Set());
    mechByPair.get(pair).add(mech);
    if (from && to && t.isActive !== false) adj.get(t.from).add(t.to);
  });
  for (const [pair, mechs] of mechByPair) {
    if (mechs.size > 1) add('error', 'CST-04', `${D}.${pair}`, 'same transition reached by both activity action and explicit status update');
  }
  for (const a of actions) {
    if (!usedActions.has(a.key)) add('warning', 'CST-03', `${D}.Action.${a.key}`, 'action not used by any transition');
  }

  // Reachability
  if (initials.length === 1) {
    const reach = new Set([initials[0].key]);
    const stack = [initials[0].key];
    while (stack.length) for (const n of adj.get(stack.pop()) || []) if (!reach.has(n)) { reach.add(n); stack.push(n); }
    for (const s of statuses) {
      if (!inactive(s) && !reach.has(s.key)) add('error', 'CST-03', `${D}.Status.${s.key}`, 'not reachable from the initial status');
    }
  }
  const terminalKeys = new Set(terminals.map(s => s.key));
  for (const s of statuses) {
    if (s.terminal || inactive(s)) continue;
    const seen = new Set([s.key]); const stack = [s.key]; let ok = false;
    while (stack.length && !ok) for (const n of adj.get(stack.pop()) || []) {
      if (terminalKeys.has(n)) { ok = true; break; }
      if (!seen.has(n)) { seen.add(n); stack.push(n); }
    }
    if (!ok) add('error', 'CST-03', `${D}.Status.${s.key}`, 'cannot reach any terminal status (dead end)');
  }
}

const errors = findings.filter(f => f.severity === 'error').length;
const warnings = findings.length - errors;
if (asJson) {
  console.log(JSON.stringify({ file, errors, warnings, findings }, null, 2));
} else {
  for (const f of findings) console.log(`${f.severity.toUpperCase().padEnd(7)} ${f.rule.padEnd(7)} ${f.where}: ${f.message}`);
  console.log(`\n${file}: ${errors} error(s), ${warnings} warning(s)`);
}
process.exit(errors ? 1 : 0);
