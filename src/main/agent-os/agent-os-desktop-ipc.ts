import { ipcMain } from 'electron'
import { createAgentOsClient } from '../../../agent-os/renderer/agent-os-api-client'
import type { AgentOsPublicConfig } from '../../shared/agent-os-endpoints'
import { decideCockpit, loadCockpitQueue } from '../../../uao/desktop-shell/cockpit-queue'
import { fetchPublishedPanes } from '../../../uao/desktop-shell/uao-desktop-panes'
import { probeWorkstation, workstationTargets } from '../../../uao/desktop-shell/workstation-health'

function clientFor(
  config: AgentOsPublicConfig,
  token: string | null
): ReturnType<typeof createAgentOsClient> {
  return createAgentOsClient({
    baseUrl: config.baseUrl,
    token: token ?? undefined
  })
}

export function registerAgentOsDesktopIpc(deps: {
  getConfig: () => AgentOsPublicConfig
  getToken: () => string | null
}): void {
  ipcMain.handle('agent-os:cockpit', () => {
    const config = deps.getConfig()
    return loadCockpitQueue(clientFor(config, deps.getToken()))
  })
  ipcMain.handle('agent-os:cockpitDecide', (_event, id: string, approved: boolean) => {
    const config = deps.getConfig()
    return decideCockpit(clientFor(config, deps.getToken()), id, approved === true)
  })
  ipcMain.handle('agent-os:workstationHealth', () =>
    probeWorkstation(workstationTargets(deps.getConfig()))
  )
  ipcMain.handle('agent-os:publishedPanes', () =>
    fetchPublishedPanes(deps.getConfig().baseUrl, deps.getToken())
  )
}
