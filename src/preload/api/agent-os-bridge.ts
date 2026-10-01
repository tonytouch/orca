import { ipcRenderer } from 'electron'
import type {
  AgentOsEndpointConfig,
  AgentOsPublicConfig,
  AgentOsTokenService
} from '../../shared/agent-os-endpoints'
import type { AgentOsBackendSnapshot } from '../../shared/agent-os-types'

export type AgentOsBridgeApi = {
  getStatus: () => Promise<AgentOsBackendSnapshot>
  reprobe: () => Promise<AgentOsBackendSnapshot>
  getBaseUrl: () => Promise<string>
  getConfig: () => Promise<AgentOsPublicConfig>
  setConfig: (config: AgentOsEndpointConfig) => Promise<AgentOsPublicConfig>
  setToken: (
    service: AgentOsTokenService,
    token: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  getToken: () => Promise<string | null>
  onStatusChange: (callback: (status: AgentOsBackendSnapshot) => void) => () => void
}

export const agentOsApi: AgentOsBridgeApi = {
  getStatus: () => ipcRenderer.invoke('agent-os:getStatus'),
  reprobe: () => ipcRenderer.invoke('agent-os:reprobe'),
  getBaseUrl: () => ipcRenderer.invoke('agent-os:getBaseUrl'),
  getConfig: () => ipcRenderer.invoke('agent-os:getConfig'),
  setConfig: (config) => ipcRenderer.invoke('agent-os:setConfig', config),
  setToken: (service, token) => ipcRenderer.invoke('agent-os:setToken', service, token),
  getToken: () => ipcRenderer.invoke('agent-os:getToken'),
  onStatusChange: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, status: AgentOsBackendSnapshot): void => {
      callback(status)
    }
    ipcRenderer.on('agent-os:statusChanged', handler)
    return () => {
      ipcRenderer.removeListener('agent-os:statusChanged', handler)
    }
  }
}
