#!/usr/bin/env node
// Consistency checks for the outsystems-cmf skill (Node.js 16+, no packages).
//   node scripts/check_skill.mjs
// Exit code: 0 = all checks pass, 1 = at least one error.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const errors = [];
const warnings = [];
const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(relative(ROOT, full).split(sep).join("/"));
  }
  return out;
}
const files = walk(ROOT);

// 1. SKILL.md frontmatter
const skill = read("SKILL.md");
const fm = skill.match(/^---\n([\s\S]*?)\n---/);
if (!fm) errors.push("SKILL.md: missing YAML frontmatter");
else {
  const get = (k) => (fm[1].match(new RegExp(`^${k}:\\s*(.*)$`, "m")) || [])[1];
  const name = get("name"), desc = get("description");
  const version = (fm[1].match(/^\s+version:\s*(\S+)/m) || [])[1];
  if (!name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) errors.push(`SKILL.md: invalid name '${name}'`);
  if (!desc) errors.push("SKILL.md: missing description");
  else if (desc.length > 1024) errors.push(`SKILL.md: description is ${desc.length} chars (max 1024)`);
  if (!get("license")) warnings.push("SKILL.md: no license field");
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) errors.push(`SKILL.md: metadata.version '${version}' is not semver`);
  else if (!read("CHANGELOG.md").includes(`## ${version}`)) errors.push(`CHANGELOG.md: no entry for version ${version}`);
}
const skillLines = skill.split("\n").length;
if (skillLines > 500) errors.push(`SKILL.md: ${skillLines} lines (max 500)`);
else if (skillLines > 250) warnings.push(`SKILL.md: ${skillLines} lines (aim for < 250)`);

// 2. Referenced paths exist (paths owned by companion skills are written "(… there)" and skipped)
const pathRe = /`?((?:references|templates|scripts|adapters|evals)\/[A-Za-z0-9_./-]+\.(?:mdc|md|mjs|json))(?![A-Za-z])`?( there)?/g;
for (const f of files.filter((x) => x.endsWith(".md"))) {
  for (const m of read(f).matchAll(pathRe)) {
    if (m[2]) continue;
    if (!existsSync(join(ROOT, m[1]))) errors.push(`${f}: references missing file ${m[1]}`);
  }
}

// 3. Own rule IDs: defined once in the checklist (or lessons), every cited own ID defined
const checklist = read("references/review-checklist.md");
const defined = [...checklist.matchAll(/^\| ((?:CAR|CDF|CST|CAC|CSC|CSL|CUI|COP)-\d+) \|/gm)].map((m) => m[1]);
const lessons = [...read("references/lessons-learned.md").matchAll(/^\| `(CLL-\d+)` \|/gm)].map((m) => m[1]);
const all = [...defined, ...lessons];
const dup = all.filter((id, i) => all.indexOf(id) !== i);
if (dup.length) errors.push(`duplicate rule IDs ${[...new Set(dup)].join(", ")}`);
const definedSet = new Set(all);
const idRe = /\b(CAR|CDF|CST|CAC|CSC|CSL|CUI|COP|CLL)-(\d+)\b/g;
const SELF = new Set(["scripts/check_skill.mjs"]);
for (const f of files.filter((x) => /\.(md|mjs|json)$/.test(x) && !SELF.has(x))) {
  for (const m of read(f).matchAll(idRe)) {
    if (!definedSet.has(m[0])) errors.push(`${f}: cites undefined rule ${m[0]}`);
  }
}

// 3b. Companion-skill rule IDs (BPT: P*) must exist in outsystems-bpt when it is installed next to this skill
const bptChecklist = ["../outsystems-bpt/references/review-checklist.md"].map((p) => join(ROOT, p)).find(existsSync);
if (bptChecklist) {
  const bptText = readFileSync(bptChecklist, "utf8");
  const bptIds = new Set([...bptText.matchAll(/\b(P[A-Z]{2}-\d+)\b/g)].map((m) => m[1]));
  for (const f of files.filter((x) => /\.(md|json)$/.test(x))) {
    for (const m of read(f).matchAll(/\b(PAR|PDS|PHA|PAA|PLT|PEX|PVR|POP|PSC|PNM)-\d+\b/g)) {
      if (!bptIds.has(m[0])) errors.push(`${f}: cites ${m[0]}, not defined in outsystems-bpt`);
    }
  }
} else warnings.push("outsystems-bpt not found next to this skill: BPT rule IDs not cross-checked");

// 4. Adapters carry the same core-rules block
const block = (t) => (t.match(/<!-- BEGIN core rules -->[\s\S]*?<!-- END core rules -->/) || [])[0];
const agentsBlock = block(read("adapters/AGENTS.md"));
if (!agentsBlock) errors.push("adapters/AGENTS.md: missing BEGIN/END core rules markers");
if (existsSync(join(ROOT, "adapters/copilot-instructions.md"))) {
  if (block(read("adapters/copilot-instructions.md")) !== agentsBlock)
    errors.push("adapters/copilot-instructions.md: core rules block differs from adapters/AGENTS.md");
}

// 4b. Public-repo files present
for (const f of ["README.md", "LICENSE", "CHANGELOG.md", "CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md", "THIRD_PARTY_NOTICES.md", "evals/evals.json"]) {
  if (!existsSync(join(ROOT, f))) errors.push(`missing ${f}`);
}

// 4c. Example GUIDs are unique across example files (never copied from a real system)
const exGuids = new Map();
for (const f of files.filter((x) => x.startsWith("scripts/examples/") && x.endsWith(".json") && !x.includes("bad-"))) {
  for (const m of read(f).matchAll(/"guid":\s*"([0-9a-f-]{36})"/gi)) {
    if (exGuids.has(m[1])) errors.push(`${f}: GUID ${m[1]} also used in ${exGuids.get(m[1])}`);
    exGuids.set(m[1], f);
  }
}

// 5. Privacy / secret hygiene (generic patterns only)
const secretRes = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["']?[A-Za-z0-9+/_-]{16,}/i, "credential-like assignment"],
  [/\b[A-Za-z0-9._%+-]+@(?!example\.(?:com|org)\b|noreply\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, "e-mail address"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/, "IP address"],
];
for (const f of files.filter((x) => /\.(md|mjs|json)$/.test(x) && x !== "scripts/check_skill.mjs")) {
  read(f).split("\n").forEach((line, i) => {
    for (const [re, what] of secretRes) if (re.test(line)) errors.push(`${f}:${i + 1}: possible ${what}`);
  });
}

for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.log(`error:   ${e}`);
console.log(errors.length ? `FAILED: ${errors.length} error(s)` : `OK: ${files.length} files checked, ${defined.length} rules + ${lessons.length} lessons`);
process.exit(errors.length ? 1 : 0);
