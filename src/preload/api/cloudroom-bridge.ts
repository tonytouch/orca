import { ipcRenderer } from 'electron'
import type {
  CloudroomCallResult,
  CloudroomEvent,
  CloudroomHealth,
  CloudroomSessionSummary
} from '../../../uao/cloudroom/cloudroom-types'

export type CloudroomCreateSessionInput = {
  harness: string
  prompt?: string
  workspace?: string
}

export type CloudroomBridgeApi = {
  health: () => Promise<CloudroomHealth>
  listSessions: () => Promise<CloudroomCallResult<CloudroomSessionSummary[]>>
  createSession: (
    input: CloudroomCreateSessionInput
  ) => Promise<CloudroomCallResult<{ sessionId: string }>>
  events: (sessionId: string, after: number) => Promise<CloudroomCallResult<CloudroomEvent[]>>
}

export const cloudroomApi: CloudroomBridgeApi = {
  health: () => ipcRenderer.invoke('cloudroom:health'),
  listSessions: () => ipcRenderer.invoke('cloudroom:listSessions'),
  createSession: (input) => ipcRenderer.invoke('cloudroom:createSession', input),
  events: (sessionId, after) => ipcRenderer.invoke('cloudroom:events', sessionId, after)
}
