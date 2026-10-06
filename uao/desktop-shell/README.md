# UAO desktop shell

The separate Electron app (`ai.uao.desktop`, version 0.0.0) was a window onto Ultimate Agent OS. This fork's Agent OS page is that window. The private repo `tonytouch/ultimate-agent-os` was not readable from the build environment (GitHub returns 404), and `server.tail85e19.ts.net` does not resolve here, so the pane list is the screens Keith named plus the route list captured earlier from that repo at `83c812da`.

Chat is first. The saved Agent OS URL is the front end. `https://server.tail85e19.ts.net:8444/#/chat` is the default. `http://` and a Tailscale IP still work. Port `5050` keeps the older embed UI.

| Screen                         | Where it opens                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat                           | `{Agent OS URL}/#/chat` (first pane). On port 5050 this is Overview instead: `{url}/?embed=1#overview`.                                                                 |
| Missions, Terminal, Approvals  | Only on port 5050, same embed UI the phone already used.                                                                                                                |
| Hermes WebUI                   | `{Agent OS origin}/hermes-webui`                                                                                                                                        |
| Cockpit approvals              | Native queue. Calls `/api/approval/pending`, `/api/approval/history`, and approve or reject. The token stays in the main process.                                       |
| Omniroute                      | The Omniroute URL from Endpoints.                                                                                                                                       |
| Antigravity                    | HTTP port `8010` on the Agent OS host, or the Antigravity URL from Endpoints.                                                                                           |
| Workstation health             | Native list. Checks Chat, `/healthz`, Hermes, Hermes WebUI, Omniroute, Antigravity, OpenMAIC, CloudRoom `/v1/ready`, and OpenMuse when those URLs are set.              |
| OpenMAIC                       | HTTP port `3000` on the Agent OS host, or the OpenMAIC URL from Endpoints. Port 3000 is the public OpenMAIC default, not a port read from the private repo.             |
| Jarvis                         | No extra pane unless Endpoints has a Jarvis URL. The old note that Jarvis was Open WebUI on port 8444 is the same host as Chat, so a second pane would open Chat twice. |
| Anything else the server lists | `GET /api/agent-os/panes` on the Agent OS origin. Recognized http(s) entries are added to the row. A non-http URL is ignored.                                           |

CloudRoom and OpenMuse stay their own sidebar pages.

`ultimate-agent-os` was not modified. If that server hides its navigation when `embed=1` is set, this app does not need a new embed flag: Chat is loaded as `#/chat` with no embed query. The older UI on port 5050 still sends `?embed=1` because that is how its screens are addressed.
