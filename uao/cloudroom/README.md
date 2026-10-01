# CloudRoom

CloudRoom is a server Keith runs. UAO does not install it, start it, or ship its code. The desktop app talks to cloudroom-core over its HTTP API and stores the bearer token in the OS keychain, the same way it stores the Agent OS token.

The server project is [davidondrej/cloudroom-core](https://github.com/davidondrej/cloudroom-core) (Apache-2.0). Its own default listen address is `127.0.0.1:9840`. UAO's default URL is `http://100.90.167.20:9840` (that Tailscale address, port 9840). Change it under Endpoints. Clear the field to hide CloudRoom from the sidebar and the new-agent menu.

## What Keith runs on the server

Use a machine on the tailnet whose address is `100.90.167.20`. The steps below follow cloudroom-core's Ubuntu 24.04 guide. Containers and other distributions are outside that guide. If the host is a container, their `install/sandbox-start.sh` and container mode are the documented path. Do not publish port 9840 on the public internet. The API is plaintext HTTP, and the bearer token must stay on the tailnet.

1. Install or build cloudroom-core.
   - Script, on a fresh x86_64 Ubuntu 24.04 VM: `curl -fsSL https://raw.githubusercontent.com/davidondrej/cloudroom-core/main/install/install.sh -o install.sh` then `sudo bash install.sh`. It writes `/etc/cloudroom/core.env`, creates the accounts, and starts the service. It does not print the token and it does not apply SQL.
   - Or from source: install build tools, Git, current stable Rust, and Node.js 24 system-wide (`/usr/local/bin` or `/usr/bin`, not only nvm). Clone the repo and run `cargo build --locked --release`. Their setup doc has the `useradd` and `install` commands that follow.
2. Create a dedicated Postgres database with TLS and apply `docs/database/0001-session-records.sql` and `docs/database/0002-diagnostics.sql` once. The service never migrates itself.
3. Put `CLOUDROOM_TOKEN` in `/etc/cloudroom/core.env` (mode `600`, owner `cloudroom`). The install script generates one. A manual install uses `openssl rand -hex 32` the way their setup doc shows. Keep the token out of git.
4. Bind the API to the Tailscale address. In that same file set:

   ```ini
   CLOUDROOM_LISTEN=100.90.167.20:9840
   CLOUDROOM_ALLOW_NON_LOOPBACK_HTTP=1
   ```

   The default bind is loopback. cloudroom-core refuses any other address unless `CLOUDROOM_ALLOW_NON_LOOPBACK_HTTP=1` is set. That flag allows plaintext HTTP. It does not add TLS. Tailscale is the private network. Do not also open 9840 on a public interface.

5. Set `CLOUDROOM_DATABASE_URL`, `CLOUDROOM_STORE=self-hosted`, `CLOUDROOM_STATE_DIR`, `CLOUDROOM_ACCOUNT_HOME`, and `CLOUDROOM_REPOSITORY` as in their setup doc.
6. Enable the service: `sudo systemctl daemon-reload` then `sudo systemctl enable --now cloudroom.service`.
7. Sign the unprivileged `cloudroom-agent` user into each harness you want. UAO does not log those CLIs in.
   - Codex: `CLOUDROOM_CODEX_BINARY`, `CLOUDROOM_CODEX_HOME`, `CLOUDROOM_CODEX_MODEL`, then `sudo -u cloudroom-agent -H codex login`.
   - Pi: `CLOUDROOM_PI_BINARY`, `CLOUDROOM_PI_HOME`, `CLOUDROOM_PI_MODEL`, `CLOUDROOM_PI_PROVIDER`.
   - Claude Code: install `claude` on the agent account (`~/.local/bin` or `/usr/local/bin`) with a `.claude` directory, then `claude auth login` as `cloudroom-agent`.
   - Cursor: install `cursor-agent` the same way, with a `.cursor` home, and log in as `cloudroom-agent`.
     Their `docs/harnesses.md` has the exact variable names and login commands.
8. Check readiness from the server, using their `api` helper so the token is not a curl argument:

   ```sh
   api http://100.90.167.20:9840/v1/ready
   ```

   Expect `{"ready":true}`. `sudo journalctl -u cloudroom.service -n 50 --no-pager` when it is not.

## What you set in UAO

Open Agent OS or CloudRoom and choose Endpoints.

- CloudRoom URL: `http://100.90.167.20:9840` (already the default).
- CloudRoom token: paste `CLOUDROOM_TOKEN`. UAO stores it with Electron `safeStorage` and will not write it if the OS keychain cannot encrypt. The renderer only learns whether a token is saved.
- The phone app has the same URL field and does not store the token.

Leave the URL empty and save to hide CloudRoom. An empty URL does not call the network.

## How a session works

1. The sidebar CloudRoom button, or CloudRoom in the new-agent menu, opens the CloudRoom page. Those entries stay hidden until a URL is saved.
2. UAO calls `GET /v1/ready` with `Authorization: Bearer …`. The banner says connected, not ready (check Postgres), token refused, or unreachable. A down server is a banner, not a crash.
3. Pick Codex, Claude Code, Pi, or Cursor. Other agents stay on a local or SSH terminal. An optional workspace id is sent as `workspace` (a cloud folder on the server). An optional first prompt is a second request.
4. Start sends `POST /v1/sessions` with a fresh `request_id`. CloudRoom answers `202` when the start is saved, not when the agent has finished. If you typed a prompt, UAO then sends `POST /v1/sessions/{id}/prompts` with a new `request_id`.
5. The page lists `GET /v1/sessions`. Click one to attach. Output is polled from `GET /v1/sessions/{id}/events?after=N` about every two seconds. This is not a terminal and not a held SSE stream.

## Not in this build

- No SSE stream (`GET /v1/sessions/{id}/stream`).
- No steer, interrupt, rewind, close, compact, or sleep.
- No file attachments, harness login buttons, or cloud-folder browser.
- No `fx` harness.
- The phone can store the URL only. It does not open a CloudRoom session.
