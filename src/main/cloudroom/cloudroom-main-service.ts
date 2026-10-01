import { app, ipcMain } from 'electron'
import { getSecretStore } from '../../shared/secret-store'
import {
  createCloudroomEnvironment,
  type CloudroomEnvironment
} from '../../../uao/cloudroom/cloudroom-environment'
import type {
  CloudroomCallResult,
  CloudroomEvent,
  CloudroomHealth,
  CloudroomSessionSummary
} from '../../../uao/cloudroom/cloudroom-types'
import { readAgentOsEndpoints, readAgentOsToken } from '../agent-os/agent-os-endpoint-store'

function userDataDir(): string {
  return app.getPath('userData')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export class CloudroomMainService {
  private environment(): CloudroomEnvironment {
    const endpoints = readAgentOsEndpoints(userDataDir())
    const token = readAgentOsToken(userDataDir(), getSecretStore(), 'cloudroom') ?? ''
    return createCloudroomEnvironment({ baseUrl: endpoints.cloudroomUrl, token })
  }

  async health(): Promise<CloudroomHealth> {
    try {
      return await this.environment().health()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CloudRoom is unreachable.'
      return { status: 'unreachable', baseUrl: '', message }
    }
  }

  async listSessions(): Promise<CloudroomCallResult<CloudroomSessionSummary[]>> {
    try {
      return await this.environment().listSessions()
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'CloudRoom request failed.'
      }
    }
  }

  async createSession(input: unknown): Promise<CloudroomCallResult<{ sessionId: string }>> {
    if (!isRecord(input) || typeof input.harness !== 'string') {
      return {
        ok: false,
        error: 'CloudRoom runs Codex, Claude Code, Pi, and Cursor. Pick one of those.'
      }
    }
    try {
      return await this.environment().createSession({
        harness: input.harness,
        ...(typeof input.prompt === 'string' ? { prompt: input.prompt } : {}),
        ...(typeof input.workspace === 'string' ? { workspace: input.workspace } : {})
      })
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'CloudRoom request failed.'
      }
    }
  }

  async events(sessionId: unknown, after: unknown): Promise<CloudroomCallResult<CloudroomEvent[]>> {
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return { ok: false, error: 'Missing CloudRoom session.' }
    }
    const cursor = typeof after === 'number' && Number.isFinite(after) ? after : 0
    try {
      return await this.environment().events(sessionId, cursor)
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'CloudRoom request failed.'
      }
    }
  }

  registerIpcHandlers(): void {
    ipcMain.handle('cloudroom:health', () => this.health())
    ipcMain.handle('cloudroom:listSessions', () => this.listSessions())
    ipcMain.handle('cloudroom:createSession', (_event, input: unknown) => this.createSession(input))
    ipcMain.handle('cloudroom:events', (_event, sessionId: unknown, after: unknown) =>
      this.events(sessionId, after)
    )
  }
}

let instance: CloudroomMainService | null = null

export function getCloudroomMainService(): CloudroomMainService {
  if (!instance) {
    instance = new CloudroomMainService()
  }
  return instance
}
