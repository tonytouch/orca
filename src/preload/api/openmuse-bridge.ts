import { ipcRenderer } from 'electron'
import type { OpenMuseHealth } from '../../../uao/openmuse/openmuse-health'

export type OpenMuseBridgeApi = {
  health: () => Promise<OpenMuseHealth>
}

export const openmuseApi: OpenMuseBridgeApi = {
  health: () => ipcRenderer.invoke('openmuse:health')
}
