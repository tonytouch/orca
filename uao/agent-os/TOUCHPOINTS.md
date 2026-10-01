# Historical touchpoint list (v1.4.203 vendor)

Paths below assume Orca lived in an `orca/` subdirectory. The same edits on this fork are relative to the repository root, and the current list of upstream files is [`../TOUCHED-UPSTREAM.md`](../TOUCHED-UPSTREAM.md).

# TOUCHPOINTS — every edit outside `orca/agent-os/`

The fork boundary is [`agent-os/`](./README.md). Anything changed in Orca's own
tree is an exception and must be listed here, with the reason, so
"what did we change?" stays a one-file answer even after a hard fork.

## Applied

| Path | Status | Why |
|---|---|---|
| `orca/Makefile` | **new file** | Upstream has none. TOOLS.md's delegation contract requires a subdir Makefile to own any target the workspace delegates to, so this shim is what keeps the root recipes single-line `make -C orca <t>`. |
| `orca/ORCA-BASELINE.md`, `orca/ORCA-BASELINE.sha` | **new files** | Baseline record written by `scripts/vendor-orca.sh`. |
| `orca/agent-os/**` | **new directory** | The entire integration surface (backend supervisor, state, ports). |
| `orca/src/shared/agent-os-types.ts` | **new file** | Shared Agent OS types (`AgentOsBackendMode`, `AgentOsBackendStatus`, `AgentOsBackendSnapshot`) accessible across main, preload, and renderer. |
| `orca/src/main/agent-os/agent-os-main-service.ts` | **new file** | Agent OS supervisor and IPC handlers (`agent-os:getStatus`, `agent-os:getBaseUrl`, `agent-os:getToken`, and status broadcasting). |
| `orca/src/main/startup/main-process-ipc-bootstrap.ts` | **modified** | Registers Agent OS IPC handlers via `getAgentOsMainService().registerIpcHandlers()`. |
| `orca/src/main/startup/main-process-ready.ts` | **modified** | Starts Agent OS service via `getAgentOsMainService().start()`. |
| `orca/src/main/startup/main-process-quit.ts` | **modified** | Stops Agent OS service via `getAgentOsMainService().stop()`. |
| `orca/src/preload/api/agent-os-bridge.ts` | **new file** | Implements renderer-side IPC bridge for Agent OS status, config, and events. |
| `orca/src/preload/api-types.ts` | **modified** | Exposes `agentOs: AgentOsBridgeApi` on `PreloadApi`. |
| `orca/src/preload/index.ts` | **modified** | Bridges `agentOs: agentOsApi` to `window.api`. |
| `orca/src/shared/ui-chrome-types.ts` | **modified** | Adds `'agent-os'` to `TopLevelView` union. |
| `orca/src/shared/top-level-view.ts` | **modified** | Adds `'agent-os': true` to `TOP_LEVEL_VIEW_LOOKUP`. |
| `orca/src/shared/rpc-contract/client-ui-params.ts` | **modified** | Adds `'agent-os'` to `TopLevelViewSchema` Zod enum. |
| `orca/src/renderer/src/agent-os/AgentOsView.tsx` | **new file** | Embed container hosting `agent-os-ui` (`?embed=1#overview`) with supervisor connection banner and retry controls. |
| `orca/src/renderer/src/app-shell/AppWorkspaceShell.tsx` | **modified** | Lazy-loads and renders `AgentOsView` when `activeView === 'agent-os'`. |
| `orca/src/renderer/src/components/sidebar/SidebarNav.tsx` | **modified** | Adds `Cpu` icon button for Agent OS in navigation rail. |
| `orca/src/renderer/src/store/slices/ui/*` | **modified** | Adds `openAgentOsPage` action and `previousViewBeforeAgentOs` navigation state. |
| `orca/src/shared/tui-agent*.ts`, `orca/src/renderer/src/lib/agent-catalog.tsx`, etc. | **modified** | Extends Orca's agent fleet with `kimchi` and `mavis` CLI definitions, launch configurations, icons, and telemetry schemas. |
| `orca/config/locales/en.json` | **modified** | Synchronized localization catalog keys. |
| `orca/mobile/app/_layout.tsx` | **modified** | Registers the Agent OS route in the mobile Expo Router navigation stack. |
| `orca/mobile/app/agent-os.tsx` | **new file** | Mobile Agent OS screen with embedded WebView, host auto-discovery, custom endpoint configuration, and quick navigation. |
| `orca/mobile/src/home/MobileHomeTopBar.tsx` | **modified** | Adds quick-access Agent OS icon button in top app bar. |
| `orca/mobile/src/home/MobileHomeScreen.tsx` | **modified** | Wires navigation to `/agent-os`. |
| `orca/mobile/src/settings/mobile-settings-menu-items.ts` | **modified** | Adds Agent OS entry to mobile settings menu. |
| `orca/mobile/package.json` | **modified** | Pins `packageManager: pnpm@12.0.0...` so mobile directory dispatches to pnpm 12 matching lockfile. |

## Planned (in progress / next phases)

| Path | Planned change | Why it cannot live in `agent-os/` |
|---|---|---|
| `docs/architecture/orca-agentos-merge.md` | Verification and deployment docs | Keep merge architecture and user docs updated with multi-platform parity |

## Rules for adding a row

1. Prefer a new file in `agent-os/` over an edit anywhere else. If a hook or IPC
   channel does not exist for what you need, add it in `agent-os/` and export it
   rather than reaching into Orca's modules.
2. Keep edits one-liners. An edit that needs more than a few lines is a design
   smell — it usually means something belongs in the supervisor or the pane layer.
3. Never edit a file to work around a design gate. `docs/STYLEGUIDE.md` and
   `pnpm run check:code-quality:changed` have documented exemption paths; a
   blanket `oxlint-disable` or a `max-lines` bump is explicitly forbidden by
   upstream's own AGENTS.md and inherits to us.
