/**
 * Supervises the Agent OS backend for the Orca shell.
 *
 * The app hosts Agent OS as a *service*, not as a library: `backend.js` stays the
 * authoritative front door on :5050 and this only decides whether to attach to
 * one that is already there or start one.
 *
 * Why attach-first: the same box can already be running agent-os-backend.service
 * (the server) or a dev backend from a terminal (the Mac). Spawning a second one
 * cannot work — backend.js refuses a second bind and exits non-zero via its own
 * [FATAL] port guard — so the port probe must come first, exactly as it does for
 * the Orca runtime's own userData-profile conflict.
 *
 * Uses Orca's single child-process entry point: a ratchet test fails on any new
 * direct `node:child_process` import outside src/shared/child-process/.
 */
import { connect } from 'node:net'
import { spawnProcess } from '../../src/shared/child-process/run-process'

import type {
  AgentOsBackendMode,
  AgentOsBackendStatus,
  AgentOsBackendSnapshot
} from '../../src/shared/agent-os-types'

export type { AgentOsBackendMode, AgentOsBackendStatus, AgentOsBackendSnapshot }

export type AgentOsBackendSupervisorOptions = {
  /** Repo root containing backend.js. Unused in `remote` mode. */
  repoRoot: string
  /** Node binary to launch the backend with. Defaults to the Electron binary
   *  running as node, so the app never depends on a node install on PATH. */
  nodeBinary: string
  port?: number
  mode?: AgentOsBackendMode
  /** Set for `remote` mode: the peer to probe instead of 127.0.0.1. */
  remoteBaseUrl?: string
  /** Injected so tests can drive the clock instead of sleeping. */
  now?: () => number
}

const DEFAULT_PORT = 5050
/** Bound so a backend that can never bind stops being retried, mirroring
 *  backend.js's own StartLimitBurst=3 reasoning. */
const MAX_RESTARTS = 3
const RESTART_BACKOFF_MS = [1_000, 4_000, 15_000]
const PORT_PROBE_TIMEOUT_MS = 700
const HEALTH_TIMEOUT_MS = 4_000

type BackendChild = ReturnType<typeof spawnProcess>

export function buildAgentOsBackendEnvironment(
  env: NodeJS.ProcessEnv,
  port: number
): NodeJS.ProcessEnv {
  return {
    ...env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(port),
    NODE_ENV: 'production'
  }
}

/** Resolves true when something is accepting connections on the port. */
export function isPortListening(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host })
    let settled = false
    const settle = (listening: boolean): void => {
      if (settled) {
        return
      }
      settled = true
      socket.destroy()
      resolve(listening)
    }
    socket.setTimeout(PORT_PROBE_TIMEOUT_MS)
    socket.once('connect', () => settle(true))
    socket.once('timeout', () => settle(false))
    socket.once('error', () => settle(false))
  })
}

/** The backend exempts /healthz from its token perimeter, so this needs no auth. */
export async function probeAgentOsHealth(baseUrl: string): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl}/healthz`, { signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export function createAgentOsBackendSupervisor(options: AgentOsBackendSupervisorOptions): {
  start: () => Promise<AgentOsBackendSnapshot>
  stop: () => Promise<void>
  snapshot: () => AgentOsBackendSnapshot
} {
  const now = options.now ?? Date.now
  // Remote by default: UAO attaches to Keith's server and does not spawn backend.js.
  const mode: AgentOsBackendMode = options.mode ?? 'remote'
  const port = options.port ?? DEFAULT_PORT
  const baseUrl =
    mode === 'remote'
      ? (options.remoteBaseUrl ?? `http://127.0.0.1:${port}`)
      : `http://127.0.0.1:${port}`

  let child: BackendChild | null = null
  let restarts = 0
  let lastError: string | null = null
  let state: AgentOsBackendStatus = 'stopped'
  let checkedAt = now()
  let stopped = false

  const snapshot = (): AgentOsBackendSnapshot => ({
    status: state,
    baseUrl,
    port,
    mode,
    owned: child !== null,
    pid: child?.pid ?? null,
    restarts,
    lastError,
    checkedAt
  })

  const setState = (next: AgentOsBackendStatus): void => {
    state = next
    checkedAt = now()
  }

  async function healthCheck(): Promise<boolean> {
    setState('probing')
    if (await probeAgentOsHealth(baseUrl)) {
      lastError = null
      setState(child ? 'healthy' : 'attached')
      return true
    }
    setState('unhealthy')
    return false
  }

  function spawnBackend(): void {
    const spec = {
      program: options.nodeBinary,
      args: ['backend.js'],
      cwd: options.repoRoot,
      // The backend reads PORT itself; NODE_ENV=production makes it skip the
      // dev conveniences (seed tasks, verbose boot banner) the shell does not want.
      env: buildAgentOsBackendEnvironment(process.env, port),
      stdio: 'pipe' as const,
      onChildTerminated: () => {
        child = null
      }
    }
    const spawned = spawnProcess(spec)
    child = spawned
    // spawnProcess's contract puts stream error events on the caller: an
    // unhandled one is an uncaught exception that takes the main process down.
    // Output is not consumed here, so a broken pipe is swallowed like
    // runProcess does; stdin stays closed, its handler is belt and braces.
    for (const stream of [spawned.stdin, spawned.stdout, spawned.stderr]) {
      stream?.on('error', () => {})
    }
    // A spawn failure (missing node binary, unreadable cwd) emits 'error' and
    // never 'exit', so without this the crash would not even be reported.
    spawned.on('error', (error) => {
      child = null
      if (stopped) {
        return
      }
      lastError = `backend spawn failed: ${error.message}`
      if (restarts >= MAX_RESTARTS) {
        setState('failed')
        return
      }
      const backoff = RESTART_BACKOFF_MS[Math.min(restarts, RESTART_BACKOFF_MS.length - 1)]
      restarts += 1
      setState('starting')
      setTimeout(() => {
        if (!stopped) {
          void start()
        }
      }, backoff)
    })
    spawned.on('exit', (code) => {
      child = null
      if (stopped) {
        return
      }
      lastError = `backend exited with code ${code}`
      if (restarts >= MAX_RESTARTS) {
        setState('failed')
        return
      }
      const backoff = RESTART_BACKOFF_MS[Math.min(restarts, RESTART_BACKOFF_MS.length - 1)]
      restarts += 1
      setState('starting')
      setTimeout(() => {
        if (!stopped) {
          void start()
        }
      }, backoff)
    })
  }

  async function start(): Promise<AgentOsBackendSnapshot> {
    stopped = false
    // Attach-first: a healthy peer always wins over starting our own.
    if (await healthCheck()) {
      return snapshot()
    }

    if (mode === 'remote') {
      lastError = `no Agent OS backend answered at ${baseUrl}`
      setState('failed')
      return snapshot()
    }

    if (await isPortListening(port)) {
      // Something holds the port but /healthz did not answer: a wedged backend,
      // or an unrelated squatter. Either way, do not add a second process.
      lastError = `port ${port} is held by a process that is not answering /healthz`
      setState('unhealthy')
      return snapshot()
    }

    setState('starting')
    spawnBackend()
    // Health is polled rather than awaited on stdout: the backend's readiness
    // line is a human banner, and /healthz is the contract the watchdog uses.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (stopped) {
        break
      }
      if (await probeAgentOsHealth(baseUrl)) {
        setState('healthy')
        return snapshot()
      }
    }
    if (state !== 'failed') {
      lastError = lastError ?? `backend did not answer /healthz within 10s`
      setState('unhealthy')
    }
    return snapshot()
  }

  async function stop(): Promise<void> {
    stopped = true
    const current = child
    if (!current) {
      setState('stopped')
      return
    }
    child = null
    // SIGTERM only: the backend's own shutdown closes the server and its child
    // processes; killing the tree here would skip that.
    current.kill('SIGTERM')
    setState('stopped')
  }

  return { start, stop, snapshot }
}
