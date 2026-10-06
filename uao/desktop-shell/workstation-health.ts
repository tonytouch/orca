import type { AgentOsEndpointConfig } from '../../src/shared/agent-os-endpoints'
import { cancelUnreadHttpBody } from './unread-http-body'
import {
  agentOsSurfaceUrl,
  httpSidecarUrl,
  joinOriginPath
} from '../../src/shared/agent-os-surface'
import { UAO_ANTIGRAVITY_PORT, UAO_OPENMAIC_PORT } from './uao-desktop-panes'

export type WorkstationTarget = {
  id: string
  label: string
  url: string
}

export type WorkstationCheck = WorkstationTarget & {
  state: 'up' | 'down'
  detail: string
}

export type WorkstationProbe = typeof fetch

const PROBE_TIMEOUT_MS = 4_000

function pushTarget(targets: WorkstationTarget[], id: string, label: string, url: string): void {
  const trimmed = url.trim()
  if (!trimmed) {
    return
  }
  targets.push({ id, label, url: trimmed })
}

function originOf(baseUrl: string): string {
  return new URL(baseUrl).origin
}

/** Named checks for the services the desktop shell used to watch on their own. */
export function workstationTargets(config: AgentOsEndpointConfig): WorkstationTarget[] {
  const targets: WorkstationTarget[] = []
  const baseUrl = config.baseUrl.trim()
  if (baseUrl) {
    pushTarget(targets, 'chat', 'Chat', agentOsSurfaceUrl(baseUrl))
    pushTarget(targets, 'healthz', 'Agent OS health', `${originOf(baseUrl)}/healthz`)
    pushTarget(targets, 'hermes-webui', 'Hermes WebUI', joinOriginPath(baseUrl, '/hermes-webui'))
    pushTarget(
      targets,
      'antigravity',
      'Antigravity',
      httpSidecarUrl(baseUrl, UAO_ANTIGRAVITY_PORT, config.antigravityUrl)
    )
    pushTarget(
      targets,
      'openmaic',
      'OpenMAIC',
      httpSidecarUrl(baseUrl, UAO_OPENMAIC_PORT, config.openmaicUrl)
    )
  }
  pushTarget(targets, 'hermes', 'Hermes', config.hermesUrl)
  pushTarget(targets, 'omniroute', 'Omniroute', config.omnirouteUrl)
  pushTarget(targets, 'jarvis', 'Jarvis', config.jarvisUrl)
  const cloudroom = config.cloudroomUrl.trim().replace(/\/$/, '')
  if (cloudroom) {
    pushTarget(targets, 'cloudroom', 'CloudRoom', `${cloudroom}/v1/ready`)
  }
  const openmuseApi = config.openmuseApiUrl.trim().replace(/\/$/, '')
  if (openmuseApi) {
    pushTarget(targets, 'openmuse-api', 'OpenMuse API', `${openmuseApi}/api/health`)
  }
  pushTarget(targets, 'openmuse', 'OpenMuse', config.openmuseUrl)
  return targets
}

async function probeOne(
  fetchImpl: WorkstationProbe,
  target: WorkstationTarget
): Promise<WorkstationCheck> {
  try {
    const response = await fetchImpl(target.url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
    await cancelUnreadHttpBody(response)
    const status = response.status
    if (response.ok) {
      return { ...target, state: 'up', detail: `HTTP ${status}` }
    }
    return { ...target, state: 'down', detail: `HTTP ${status}` }
  } catch (error) {
    const detail = error instanceof Error && error.message.trim() ? error.message : 'request failed'
    return { ...target, state: 'down', detail }
  }
}

export async function probeWorkstation(
  targets: readonly WorkstationTarget[],
  fetchImpl: WorkstationProbe = fetch
): Promise<WorkstationCheck[]> {
  return Promise.all(targets.map((target) => probeOne(fetchImpl, target)))
}
