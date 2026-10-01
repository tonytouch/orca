# Agent OS in UAO

The desktop and phone shells attach to Keith's Agent OS host. They do not ship the Python backend or Hermes.

Executable code stays at repo-root [`agent-os/`](../../agent-os/) because the main process, the TypeScript project, and the supervisor imports already point there. This directory holds the notes.

| Path                                                 | Role                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `agent-os/supervisor/agent-os-backend-supervisor.ts` | Attaches to a running backend, or spawns `backend.js` only when local mode is on |
| `agent-os/renderer/agent-os-api-client.ts`           | HTTP client for the `:5050` API                                                  |
| `agent-os/agents/agent-os-cli-agents.json`           | kimchi and mavis launch notes                                                    |
| `src/main/agent-os/agent-os-main-service.ts`         | IPC, health poll, settings                                                       |
| `src/renderer/src/agent-os/AgentOsView.tsx`          | Embedded Agent OS page                                                           |
| `mobile/app/agent-os.tsx`                            | Phone WebView of the same host                                                   |

## Remote by default

The supervisor's default mode is `remote`. UAO starts that way unless Settings → Endpoints has "Also start a local backend on this machine" checked, or `AGENT_OS_LOCAL=1` is set. A remote attach never looks for `backend.js`.

Default URLs (not secrets), overridable in the desktop Endpoints form and on the phone:

| Service   | URL                          |
| --------- | ---------------------------- |
| Agent OS  | `http://100.90.167.20:5050`  |
| Hermes    | `http://100.90.167.20:8787`  |
| Omniroute | `http://100.90.167.20:20128` |
| CloudRoom | `http://100.90.167.20:9840`  |

Tokens are typed at runtime. The desktop app stores them with Electron `safeStorage` under the user-data directory and refuses to write a token when the OS keychain cannot encrypt. They are not in git. The phone keeps the URLs in AsyncStorage and does not store tokens. An empty CloudRoom URL hides that launch target.

`AGENT_OS_REMOTE_URL` still overrides the Agent OS base URL for one launch.

## CloudRoom

CloudRoom is a second remote endpoint, not a process this app starts. The HTTP provider lives in [`uao/cloudroom/`](../cloudroom/README.md). The desktop page lists server sessions and polls their events. It does not turn the local Agent OS supervisor on.

## Vendor notes

[`ORCA-BASELINE.md`](./ORCA-BASELINE.md), [`TOUCHPOINTS.md`](./TOUCHPOINTS.md), [`boundary-notes.md`](./boundary-notes.md), and [`design-tokens.md`](./design-tokens.md) are the notes from the v1.4.203 vendor. Paths in those files that start with `orca/` describe that older layout.
