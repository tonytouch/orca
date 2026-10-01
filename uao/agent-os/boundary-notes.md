# Historical fork-boundary note (v1.4.203 vendor)

This file was written when Orca was vendored under an `orca/` directory inside Ultimate Agent OS. In this UAO fork the executable Agent OS code stays at repo-root `agent-os/` (imports and `config/tsconfig.node.json` depend on that). The current layout, remote defaults, and the CloudRoom plug-in point are in [`README.md`](./README.md). Paths below that start with `orca/` are historical.

# orca/agent-os/ — the only place this fork differs

Everything this repo adds to Orca lives here. Treat it as the fork boundary: if
a change to Orca is not under `orca/agent-os/`, it belongs in
[`TOUCHPOINTS.md`](./TOUCHPOINTS.md), and that list should stay as short as it
can possibly be.

## Why the boundary exists

The fork is deliberate and hard — upstream is not tracked (see
[`../ORCA-BASELINE.md`](../ORCA-BASELINE.md)). But a hard fork does not have to
be an *opaque* one. Keeping the diff in one directory buys two things that cost
nothing and are nearly impossible to recover later:

1. **A readable answer to "what did we change?"** — one directory, plus a short
   enumeration of touched upstream files.
2. **Cheap rollback.** The merge is additive: removing `orca/` and reverting the
   handful of files in `TOUCHPOINTS.md` returns this workspace to its
   pre-merge state. No Agent OS runtime file is modified by any phase.

This is not a subtle nod to tracking upstream. It is just knowing what you own.

## Layout

| Path | What it is | Status |
|---|---|---|
| `supervisor/agent-os-backend-supervisor.ts` | Main-process supervisor: attaches to a running Agent OS backend or spawns one, health-gates it, restarts with bounded backoff | written, **not wired** |
| `renderer/agent-os-api-client.ts` | Typed client for the Agent OS HTTP surface (approval queue, Orca panel, healthz) | written, **not wired** |
| `agents/agent-os-cli-agents.json` | Agent OS's CLI fleet mapped onto Orca's **confirmed** schema: the picker fleet is code (`TuiAgent` union + `TUI_AGENT_CONFIG` + `agent-catalog.tsx` + display names), per-agent customization is settings (`agentCmdOverrides`/`agentDefaultArgs`/`agentDefaultEnv`); the plugin `contributes.agents` surface exists but nothing consumes it at this pin. Schema verified 2026-09-20; 6 of 8 fleet members are built-in Orca ids needing only settings pins, 2 (kimchi, mavis) need minted ids | schema verified, **wiring pending** |
| `design-tokens.md` | Agent OS `@theme` tokens → Orca token map | contract only |
| `TOUCHPOINTS.md` | Every planned edit to an upstream Orca file, by path | current |
| `README.md` | This file | current |

## The two integration directions, and which one is live

- **Agent OS → Orca exists today.** `lib/orca-client.js` creates worktrees and
  reads replies back; `routes/orca.js` exposes `/api/orca/worktree` and
  `/api/orca/panel`; `routes/orca-automations.js` wraps `orca automations *`;
  `lib/council.js` runs Orca as a council seat; `lib/dispatcher.js` runs code
  tasks through it.
- **Orca → Agent OS does not exist yet.** That is what this directory builds.

## Wiring order for whoever picks this up

1. ~~Confirm Orca's agent-profile schema before touching
   `agents/agent-os-cli-agents.json`~~ **Done 2026-09-20** — there is no JSON
   registry; the file has been rewritten into the verified shape (schemaVersion
   2) with the evidence paths inline. The cheapest remaining win is writing the
   `agentCmdOverrides` pins for the 6 builtin-id members; the 2 new ids are a
   TOUCHPOINTS-sized change, not a data edit.
2. Instantiate the supervisor from the main process and expose a status IPC
   channel. Start it in `remote` mode against the server first: that needs no
   local spawn and proves the client path on its own.
3. Add the preload bridge that hands the renderer a token. The token comes from
   Electron `safeStorage`, never from renderer storage and never from a file the
   renderer can read.
4. Only then add the Agent OS entry to the app shell and point it at
   `agent-os-ui`'s existing `?embed=1` build.

## Constraints that are easy to trip over

- **No direct `node:child_process` imports.** A ratchet test
  (`src/shared/child-process/child-process-import-boundary.test.ts`) fails on new
  ones; use `spawnProcess` / `runProcess` from `src/shared/child-process/`. The
  supervisor already does.
- **Design gates are real.** `pnpm run check:code-quality:changed` fails on raw
  palette colours and computed `className` strings; `pnpm tc` and `pnpm test`
  are the typecheck and test entry points. Use the documented exemption paths,
  never a blanket lint disable.
- **The app's own test etiquette applies to this tree.** Launch with
  `ORCA_BACKGROUND_LAUNCH=1`, never steal focus or reveal test windows.
- **`pnpm install` here is heavy** (Electron plus native modules: `node-pty`,
  `sherpa-onnx`, `cpu-features`). Cross-arch packaging needs
  `make ade-install-release`.
