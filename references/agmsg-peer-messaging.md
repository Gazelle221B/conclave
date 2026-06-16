# agmsg — peer messaging transport for CLI agents

Source: <https://github.com/fujibee/agmsg>
License: MIT (`agmsg` package metadata and `LICENSE`, inspected 2026-06-16)

## What It Is

`agmsg` is a local cross-agent messaging layer for CLI AI agents such as Claude Code, Codex, Gemini CLI, GitHub Copilot CLI, Antigravity, and similar tools. Its runtime model is intentionally small: local shell scripts plus a shared SQLite database. It does not require a daemon, network service, MCP server, or broker.

In Conclave terms, `agmsg` is a **transport**, not a governance authority:

- It can carry quick peer-to-peer messages between role sessions.
- It can reduce human copy-paste when `ARCHITECT`, `IMPLEMENTER`, `REVIEWER`, and `QA_MEMORY` are live in separate terminals.
- It must not replace `PROJECT_STATE.md`, `HANDOFF.md`, `REVIEW_REPORT.md`, `QA_REPORT.md`, Git commits, or PR review.

## Fit With Conclave

Conclave deliberately separates:

| Layer | Owner | Durable? | Role |
|---|---|---:|---|
| Governance state | Conclave docs in the repo | Yes | Source of truth, audit trail, handoff safety |
| Peer notification | agmsg local SQLite store | Local only | Convenience channel between active CLI agents |
| Merge/release authority | Human + GitHub review gates | Yes | Final project authority |

This makes `agmsg` useful for live coordination without making it the memory of the project. Any decision, blocker, review verdict, QA result, or human gate discovered through `agmsg` must be copied into the relevant Conclave record before it can affect the project.

## Adoption Guidance

Use `agmsg` when a project actually has multiple simultaneous CLI agent sessions. Do not require it for solo or single-threaded projects.

Minimum decision checklist:

- The project has multiple live agent sessions that need low-friction coordination.
- The environment has `bash` and `sqlite3`, or the user agrees to install them.
- The team accepts that messages are local machine state, not durable repo state.
- `AGENTS.md` and `ORCHESTRATION_RUNBOOK.md` still define the role boundaries and quality gates.
- No secrets, credentials, tokens, or private customer data are sent through the peer channel.

Suggested install paths, chosen by the project owner:

```bash
npx agmsg
# or
npm i -g agmsg && agmsg install
# or inspect first:
git clone https://github.com/fujibee/agmsg.git
cd agmsg
./install.sh
```

## Conclave Guardrails

- **No hidden authority**: an `agmsg` message is not approval, QA PASS, or merge permission.
- **No undocumented decisions**: summarize accepted `agmsg` outcomes in `PROJECT_STATE.md`, `HANDOFF.md`, or the relevant report.
- **No self-review bypass**: a fast message from the implementer to the reviewer does not relax role independence.
- **No secret transport**: keep credentials out of local peer messages.
- **No mandatory dependency**: Conclave remains usable without `agmsg`.

## Why Not Vendor It

Vendoring `agmsg` into Conclave would couple two different products:

- Conclave is the governance substrate and template kit.
- agmsg is a live local messaging runtime with its own installer, storage model, tests, release cadence, and host-agent integrations.

The right integration point is documentation and generated operating guidance. Projects that need live peer messaging can install `agmsg` explicitly and then record its use in their Conclave docs.
