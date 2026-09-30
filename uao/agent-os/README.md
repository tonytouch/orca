# Agent OS port

This directory is the place for Ultimate Agent OS. It is empty on purpose.

Phase 1 was supposed to port the integration that already exists on `tonytouch/ultimate-agent-os`, branch `agent/dashboard-audit-fixes-20260916`, where Orca v1.4.203 (commit `776e424e`) had been vendored under `orca/`. The notes name these entry points:

- `orca/src/renderer/src/agent-os/AgentOsView.tsx`, used by `AppWorkspaceShell.tsx`
- `agent-os-main-service.ts` (supervisor)
- kimchi and mavis agents
- `mobile/app/agent-os.tsx`
- `docs/architecture/orca-agentos-merge.md`, `orca/ORCA-BASELINE.md`, `orca/TOUCHPOINTS.md`

This agent could not read that repository. `gh` and `git ls-remote` both return 404 for `tonytouch/ultimate-agent-os` with the token on this run. Nothing from that tree was copied, and no substitute Agent OS UI was invented.

Upstream Orca on this fork is past v1.4.203 (`package.json` is 1.4.214). When the private repo is readable, port by diffing `ultimate-agent-os/orca` against commit `776e424e`, then replaying that diff onto current `main`. Put new modules under `uao/agent-os/` or `src/renderer/src/agent-os/` and add every upstream file you must touch to `uao/TOUCHED-UPSTREAM.md`.

CloudRoom (Apache-2.0) is also not in this patch.
