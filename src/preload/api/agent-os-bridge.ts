import { ipcRenderer } from 'electron'
import type {
  AgentOsEndpointConfig,
  AgentOsPublicConfig,
  AgentOsTokenService
} from '../../shared/agent-os-endpoints'
import type { AgentOsBackendSnapshot } from '../../shared/agent-os-types'
import type { CockpitQueue } from '../../../uao/desktop-shell/cockpit-queue'
import type { PublishedPane } from '../../../uao/desktop-shell/uao-desktop-panes'
import type { WorkstationCheck } from '../../../uao/desktop-shell/workstation-health'

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
  cockpit: () => Promise<CockpitQueue>
  decideCockpit: (id: string, approved: boolean) => Promise<void>
  workstationHealth: () => Promise<WorkstationCheck[]>
  publishedPanes: () => Promise<PublishedPane[]>
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
  cockpit: () => ipcRenderer.invoke('agent-os:cockpit'),
  decideCockpit: (id, approved) => ipcRenderer.invoke('agent-os:cockpitDecide', id, approved),
  workstationHealth: () => ipcRenderer.invoke('agent-os:workstationHealth'),
  publishedPanes: () => ipcRenderer.invoke('agent-os:publishedPanes'),
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
