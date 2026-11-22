# Security policy

This repository contains guidance (Markdown) and small zero-dependency Node.js scripts. It has no runtime service.

## Reporting
- **A rule that would lead to insecure OutSystems code** (e.g. advice that exposes case data through a Reactive endpoint or weakens CMF access control): open a GitHub **Security Advisory** (Security → Report a vulnerability) or a normal issue labelled `security`, with the rule ID and the source.
- **A vulnerability in the scripts** (`scripts/*.mjs`): report it privately through a Security Advisory. Don't open a public issue.
- **Secrets or confidential data committed by mistake**: report it privately right away. Maintainers will remove it and rewrite history if needed.

The scripts only read a local JSON file and print a report. They make no network calls and run nothing external.

## Scope
Vulnerabilities in OutSystems, the Case Management Framework or other Forge components are **out of scope**. Report them to OutSystems through their official support and security channels.
