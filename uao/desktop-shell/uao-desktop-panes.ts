import type { AgentOsEndpointConfig } from '../../src/shared/agent-os-endpoints'
import { cancelUnreadHttpBody } from './unread-http-body'
import {
  agentOsPrimaryLinks,
  agentOsSurfaceUrl,
  httpSidecarUrl,
  joinOriginPath
} from '../../src/shared/agent-os-surface'

/** Antigravity sidecar from the desktop shell. Plain HTTP unless Endpoints says otherwise. */
export const UAO_ANTIGRAVITY_PORT = 8010
/** Public OpenMAIC listens on 3000. Override it in Endpoints when this host uses another port. */
export const UAO_OPENMAIC_PORT = 3000

export type UaoPagePane = {
  id: string
  label: string
  kind: 'page'
  url: string
}

export type UaoDesktopPane =
  | UaoPagePane
  | { id: 'cockpit'; label: string; kind: 'cockpit' }
  | { id: 'workstation'; label: string; kind: 'workstation' }

export type PublishedPane = {
  id: string
  label: string
  url: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  return typeof value === 'string' ? value.trim() : ''
}

function resolvePublishedUrl(baseUrl: string, value: string): string | null {
  if (value.startsWith('#')) {
    return agentOsSurfaceUrl(baseUrl, value) || null
  }
  try {
    if (value.startsWith('/')) {
      return joinOriginPath(baseUrl, value)
    }
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

/** Chat (or Overview on :5050) first, then the other desktop-shell screens. */
export function uaoDesktopPanes(config: AgentOsEndpointConfig): UaoDesktopPane[] {
  const baseUrl = config.baseUrl.trim()
  if (!baseUrl) {
    return []
  }
  const pages: UaoPagePane[] = agentOsPrimaryLinks(baseUrl).map((link) => ({
    id: link.id,
    label: link.label,
    kind: 'page',
    url: link.url
  }))
  const panes: UaoDesktopPane[] = [...pages, { id: 'cockpit', label: 'Cockpit', kind: 'cockpit' }]
  if (!pages.some((pane) => pane.id === 'hermes-webui')) {
    panes.push({
      id: 'hermes-webui',
      label: 'Hermes',
      kind: 'page',
      url: joinOriginPath(baseUrl, '/hermes-webui')
    })
  }
  const omniroute = config.omnirouteUrl.trim()
  if (omniroute) {
    panes.push({ id: 'omniroute', label: 'Omniroute', kind: 'page', url: omniroute })
  }
  panes.push({
    id: 'antigravity',
    label: 'Antigravity',
    kind: 'page',
    url: httpSidecarUrl(baseUrl, UAO_ANTIGRAVITY_PORT, config.antigravityUrl)
  })
  panes.push({ id: 'workstation', label: 'Workstation', kind: 'workstation' })
  panes.push({
    id: 'openmaic',
    label: 'OpenMAIC',
    kind: 'page',
    url: httpSidecarUrl(baseUrl, UAO_OPENMAIC_PORT, config.openmaicUrl)
  })
  const jarvis = config.jarvisUrl.trim()
  if (jarvis) {
    panes.push({ id: 'jarvis', label: 'Jarvis', kind: 'page', url: jarvis.replace(/\/$/, '') })
  }
  return panes
}

export function parsePublishedPanes(body: unknown, baseUrl: string): PublishedPane[] {
  const list = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body.panes)
      ? body.panes
      : []
  const panes: PublishedPane[] = []
  for (const item of list) {
    if (!isRecord(item) || panes.length >= 24) {
      continue
    }
    const id = stringField(item, 'id') || stringField(item, 'key')
    const label =
      stringField(item, 'label') || stringField(item, 'title') || stringField(item, 'name')
    const raw = stringField(item, 'url') || stringField(item, 'href') || stringField(item, 'path')
    if (!/^[a-z0-9-]{1,64}$/.test(id) || !label || !raw) {
      continue
    }
    const url = resolvePublishedUrl(baseUrl, raw)
    if (!url) {
      continue
    }
    panes.push({ id, label: label.slice(0, 80), url })
  }
  return panes
}

export async function fetchPublishedPanes(
  baseUrl: string,
  token: string | null,
  fetchImpl: typeof fetch = fetch
): Promise<PublishedPane[]> {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  if (!trimmed) {
    return []
  }
  try {
    const headers: Record<string, string> = {}
    if (token) {
      headers.authorization = `Bearer ${token}`
    }
    const response = await fetchImpl(`${trimmed}/api/agent-os/panes`, {
      headers,
      signal: AbortSignal.timeout(4_000)
    })
    if (!response.ok) {
      await cancelUnreadHttpBody(response)
      return []
    }
    return parsePublishedPanes(await response.json(), trimmed)
  } catch {
    return []
  }
}

export function withPublishedPanes(
  panes: readonly UaoDesktopPane[],
  published: readonly PublishedPane[]
): UaoDesktopPane[] {
  const next = panes.map((pane) => ({ ...pane }))
  for (const extra of published) {
    const index = next.findIndex((pane) => pane.id === extra.id)
    const existing = index === -1 ? undefined : next[index]
    if (existing?.kind === 'page') {
      next[index] = { ...existing, label: extra.label, url: extra.url }
      continue
    }
    if (existing) {
      continue
    }
    next.push({ id: extra.id, label: extra.label, kind: 'page', url: extra.url })
  }
  return next
}
