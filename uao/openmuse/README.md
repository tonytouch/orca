# OpenMuse in UAO

UAO embeds the OpenMuse web app. It does not clone, install, or start OpenMuse.

The app Keith runs is [CopilotKit/OpenMuse](https://github.com/CopilotKit/OpenMuse) at commit `d0b3a6b` (MIT). The desktop page is an Electron webview on its own session (`persist:openmuse`). The phone page is a WebView. Neither one stores the OpenMuse access key. Live mode asks for that key inside the page, and the session token stays in the page's memory, so a reload asks again.

## What UAO stores

Endpoints (desktop Endpoints form, and the same fields on the phone). No token field.

| Field | Default | What it is |
| ----- | ------- | ---------- |
| OpenMuse web | `http://100.90.167.20:8081` | The page the webview loads |
| OpenMuse API | `http://100.90.167.20:8787` | Health check only: `GET /api/health` must return `{"ok":true}` |

Clear the web URL to hide the desktop sidebar entry. The phone screen stays in Settings so the URL can be set again.

The running web bundle does not read the API field. It calls `EXPO_PUBLIC_API_URL`, which Expo bakes in when the dev server starts or when `pnpm build:web` runs. The API field has to be that same URL or the banner says the API is down while the page is up.

Hermes on this host is already `http://100.90.167.20:8787`. OpenMuse's own default port is also 8787. If both are running, move OpenMuse to a free port and put that port in `PORT`, `PUBLIC_API_URL`, `EXPO_PUBLIC_API_URL`, and the Endpoints API field.

## Ports on the tailnet

| Port | Who | Reachable from UAO |
| ---- | --- | ------------------ |
| 8081 | Expo web, or a static server of `apps/mobile/dist/web` | Yes |
| OpenMuse `PORT` (8787 unless moved) | Hono API | Yes |
| 8790 | Playwright browser worker | No. Stays on the server |
| Docker computer | Optional Linux box | No |

## How Keith runs it

Checkout and install (Node 24, OpenMuse's pnpm 11.19.0, not UAO's pnpm 12):

```bash
git clone https://github.com/CopilotKit/OpenMuse.git
cd OpenMuse
git checkout d0b3a6b
pnpm install --frozen-lockfile
```

Do not use sample mode on a Tailscale address. Sample mode refuses any `HOST` that is not loopback. Live mode needs:

- `WORKSPACE_MODE=live`
- `AGENT_BACKEND=model` (or `agui`, not `sample`)
- `CPK_INTELLIGENCE_API_KEY` (server only): `npx copilotkit@latest login` then `npx copilotkit@latest project select`
- `OPENMUSE_ACCESS_KEY` of at least 24 characters
- `TOKEN_ENCRYPTION_KEY` of 32 random bytes, base64
- a model provider key for the backend you picked

Bind the API on the tailnet, not on the public internet:

```bash
HOST=100.90.167.20
PORT=8787
PUBLIC_API_URL=http://100.90.167.20:8787
ALLOWED_ORIGINS=http://100.90.167.20:8081
```

`ALLOWED_ORIGINS` has to include the web origin. Otherwise the API answers `403` with `Origin is not allowed` and the page cannot sign in. `HOST=0.0.0.0` also works if the machine is only reachable on the tailnet.

Start the API with `pnpm dev`, or `pnpm build:server` then `pnpm start`. Check:

```bash
curl -sS http://100.90.167.20:8787/api/health
```

`{"ok":true}` is the ready state. Change the port in that URL if you moved it off 8787.

### Expo dev server

This is what is already bound on all interfaces at port 8081:

```bash
EXPO_PUBLIC_API_URL=http://100.90.167.20:8787 \
  pnpm --dir apps/mobile exec expo start --web --port 8081 --host lan
```

`--host lan` is what makes `http://100.90.167.20:8081` answer. A restart is required after changing `EXPO_PUBLIC_API_URL`.

### Production web build

```bash
EXPO_PUBLIC_API_URL=http://100.90.167.20:8787 pnpm build:web
```

Serve `apps/mobile/dist/web` on port 8081 at the Tailscale address. The baked API URL is fixed until the next export.

## Embed

The API does not send `X-Frame-Options` or `frame-ancestors`. Auth is an `Authorization: Bearer` header from `POST /api/session`, not a cookie. UAO still does not use an iframe. The desktop page is a `<webview>` on `persist:openmuse`, so OpenMuse storage is not the browser profile.

That session allows `clipboard-read` and `clipboard-sanitized-write` only when the requesting origin is the configured web URL. Microphone, camera, and display capture are denied. This commit of OpenMuse does not use a microphone.

The browser worker (`BROWSER_WORKER_URL`, `WORKER_TOKEN`) and the Docker computer (`COMPUTER_ENABLED`) stay on the server. They are not extra addresses in UAO.
