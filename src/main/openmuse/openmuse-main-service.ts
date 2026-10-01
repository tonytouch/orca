import { app, ipcMain, session } from 'electron'
import { readAgentOsEndpoints } from '../agent-os/agent-os-endpoint-store'
import { checkOpenMuseHealth, type OpenMuseHealth } from '../../../uao/openmuse/openmuse-health'
import {
  OPENMUSE_PARTITION,
  openMusePermissionAllowed
} from '../../../uao/openmuse/openmuse-permission'

export class OpenMuseMainService {
  installPartitionPolicy(webUrl: string): void {
    const sess = session.fromPartition(OPENMUSE_PARTITION)
    const allow = (permission: string, requestingUrl: string): boolean =>
      openMusePermissionAllowed(permission, requestingUrl, webUrl)
    sess.setPermissionRequestHandler((_webContents, permission, callback, details) => {
      callback(allow(permission, details.requestingUrl))
    })
    sess.setPermissionCheckHandler((_webContents, permission, requestingOrigin) =>
      allow(permission, requestingOrigin)
    )
    sess.setDisplayMediaRequestHandler((_request, callback) => {
      callback({})
    })
  }

  async health(): Promise<OpenMuseHealth> {
    try {
      const endpoints = readAgentOsEndpoints(app.getPath('userData'))
      this.installPartitionPolicy(endpoints.openmuseUrl)
      return await checkOpenMuseHealth({
        webUrl: endpoints.openmuseUrl,
        apiUrl: endpoints.openmuseApiUrl
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenMuse is unreachable.'
      return { status: 'unreachable', message, webUrl: '', apiUrl: '' }
    }
  }

  registerIpcHandlers(): void {
    ipcMain.handle('openmuse:health', () => this.health())
  }
}

let instance: OpenMuseMainService | null = null

export function getOpenMuseMainService(): OpenMuseMainService {
  if (!instance) {
    instance = new OpenMuseMainService()
  }
  return instance
}
