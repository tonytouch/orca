import { app, ipcMain } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'
import {
  createAgentOsBackendSupervisor,
  type AgentOsBackendSnapshot
} from '../../../agent-os/supervisor/agent-os-backend-supervisor'
import type {
  AgentOsEndpointConfig,
  AgentOsPublicConfig,
  AgentOsTokenService
} from '../../shared/agent-os-endpoints'
import { getSecretStore } from '../../shared/secret-store'
import { cancelUnreadResponseBody } from '../lib/unread-response-body'
import { mainProcessState as state } from '../startup/main-process-state'
import {
  readAgentOsEndpoints,
  readAgentOsPublicConfig,
  readAgentOsToken,
  writeAgentOsEndpoints,
  writeAgentOsToken
} from './agent-os-endpoint-store'

function userDataDir(): string {
  return app.getPath('userData')
}

function localBackendRoot(): string {
  const fromEnv = process.env.AGENT_OS_ROOT || ''
  const candidates = [fromEnv, process.cwd(), path.resolve(app.getAppPath(), '..')]
  for (const candidate of candidates) {
    if (candidate && existsSync(path.join(candidate, 'backend.js'))) {
      return candidate
    }
  }
  return fromEnv
}

export class AgentOsMainService {
  private supervisor = createAgentOsBackendSupervisor({
    repoRoot: '',
    nodeBinary: process.execPath,
    mode: 'remote'
  })
  private healthInterval: NodeJS.Timeout | null = null
  private endpointsBound = false

  // Why lazy: app.getPath throws with no ready Electron app, and that must stay inside start()'s catch.
  private bindSavedEndpoints(): void {
    if (this.endpointsBound) {
      return
    }
    this.bindSupervisor(readAgentOsEndpoints(userDataDir()))
    this.endpointsBound = true
  }

  private bindSupervisor(config: AgentOsEndpointConfig): void {
    const local = process.env.AGENT_OS_LOCAL === '1' || config.localSupervisor
    const remoteBaseUrl = process.env.AGENT_OS_REMOTE_URL || config.baseUrl
    this.supervisor = createAgentOsBackendSupervisor({
      repoRoot: local ? localBackendRoot() : '',
      nodeBinary: process.env.NODE_BINARY || process.execPath,
      mode: local ? 'local' : 'remote',
      remoteBaseUrl
    })
  }

  async start(): Promise<AgentOsBackendSnapshot> {
    return this.reprobe()
  }

  async reprobe(): Promise<AgentOsBackendSnapshot> {
    this.bindSavedEndpoints()
    const snapshot = await this.supervisor.start()
    this.broadcastStatus(snapshot)
    if (!this.healthInterval) {
      this.healthInterval = setInterval(() => {
        void this.pollHealth()
      }, 15_000)
    }
    return snapshot
  }

  private async pollHealth(): Promise<void> {
    const snap = this.supervisor.snapshot()
    if (snap.status !== 'attached' && snap.status !== 'healthy') {
      return
    }
    try {
      const res = await fetch(`${snap.baseUrl}/healthz`, { signal: AbortSignal.timeout(2000) })
      await cancelUnreadResponseBody(res)
      if (!res.ok) {
        snap.status = 'unhealthy'
        this.broadcastStatus(snap)
      }
    } catch {
      snap.status = 'unhealthy'
      this.broadcastStatus(snap)
    }
  }

  async stop(): Promise<void> {
    if (this.healthInterval) {
      clearInterval(this.healthInterval)
      this.healthInterval = null
    }
    await this.supervisor.stop()
  }

  getSnapshot(): AgentOsBackendSnapshot {
    return this.supervisor.snapshot()
  }

  getConfig(): AgentOsPublicConfig {
    return readAgentOsPublicConfig(userDataDir())
  }

  async setConfig(config: AgentOsEndpointConfig): Promise<AgentOsPublicConfig> {
    const saved = writeAgentOsEndpoints(userDataDir(), config)
    await this.supervisor.stop()
    this.bindSupervisor(saved)
    this.endpointsBound = true
    await this.reprobe()
    return this.getConfig()
  }

  setToken(
    service: AgentOsTokenService,
    token: string
  ): { ok: true } | { ok: false; error: string } {
    return writeAgentOsToken(userDataDir(), getSecretStore(), service, token)
  }

  getToken(): string | null {
    return readAgentOsToken(userDataDir(), getSecretStore(), 'agent-os')
  }

  private broadcastStatus(snapshot: AgentOsBackendSnapshot): void {
    const win = state.mainWindow
    if (win && !win.isDestroyed()) {
      win.webContents.send('agent-os:statusChanged', snapshot)
    }
  }

  registerIpcHandlers(): void {
    ipcMain.handle('agent-os:getStatus', () => this.getSnapshot())
    ipcMain.handle('agent-os:reprobe', () => this.reprobe())
    ipcMain.handle('agent-os:getBaseUrl', () => this.getSnapshot().baseUrl)
    ipcMain.handle('agent-os:getConfig', () => this.getConfig())
    ipcMain.handle('agent-os:setConfig', (_event, config: AgentOsEndpointConfig) =>
      this.setConfig(config)
    )
    ipcMain.handle('agent-os:setToken', (_event, service: AgentOsTokenService, token: string) =>
      this.setToken(service, token)
    )
    ipcMain.handle('agent-os:getToken', () => this.getToken())
  }
}

let instance: AgentOsMainService | null = null

export function getAgentOsMainService(): AgentOsMainService {
  if (!instance) {
    instance = new AgentOsMainService()
  }
  return instance
}
