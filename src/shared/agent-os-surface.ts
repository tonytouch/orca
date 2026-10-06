/** How the saved Agent OS URL is shown. `:5050` is the older embed UI. */
export type AgentOsSurfaceKind = 'embed' | 'hash'

export type AgentOsPrimaryLink = {
  id: string
  label: string
  url: string
}

const LEGACY_EMBED_PORT = '5050'

export function agentOsSurfaceKind(baseUrl: string): AgentOsSurfaceKind {
  try {
    return new URL(baseUrl).port === LEGACY_EMBED_PORT ? 'embed' : 'hash'
  } catch {
    return 'hash'
  }
}

function withoutFragment(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  const hashAt = trimmed.indexOf('#')
  return (hashAt === -1 ? trimmed : trimmed.slice(0, hashAt)).replace(/\/$/, '')
}

/** Embed UI keeps `?embed=1#overview`. The Tailscale HTTPS UI opens `#/chat`. */
export function agentOsSurfaceUrl(baseUrl: string, hash?: string): string {
  const trimmed = withoutFragment(baseUrl)
  if (!trimmed) {
    return ''
  }
  if (agentOsSurfaceKind(trimmed) === 'embed') {
    const fragment = (hash ?? 'overview').trim().replace(/^#/, '').replace(/^\//, '') || 'overview'
    return `${trimmed}/?embed=1#${fragment}`
  }
  const raw = (hash ?? '/chat').trim().replace(/^#/, '')
  const path = raw.startsWith('/') ? raw : `/${raw}`
  return `${trimmed}/#${path}`
}

export function joinOriginPath(baseUrl: string, path: string): string {
  const url = new URL(baseUrl)
  url.pathname = path.startsWith('/') ? path : `/${path}`
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

/** Sidecars are plain HTTP on the same host unless Endpoints saved a full URL. */
export function httpSidecarUrl(baseUrl: string, port: number, override: string): string {
  const trimmed = override.trim()
  if (trimmed) {
    return trimmed.replace(/\/$/, '')
  }
  const url = new URL(baseUrl)
  const host = url.hostname.includes(':') ? `[${url.hostname}]` : url.hostname
  return `http://${host}:${port}`
}

/** Chat is first on the hash-routed UI. The embed UI keeps its existing four screens. */
export function agentOsPrimaryLinks(baseUrl: string): AgentOsPrimaryLink[] {
  const trimmed = baseUrl.trim()
  if (!trimmed) {
    return []
  }
  if (agentOsSurfaceKind(trimmed) === 'embed') {
    return [
      { id: 'overview', label: 'Overview', url: agentOsSurfaceUrl(trimmed, 'overview') },
      {
        id: 'mission-control',
        label: 'Missions',
        url: agentOsSurfaceUrl(trimmed, 'mission-control')
      },
      { id: 'terminal', label: 'Terminal', url: agentOsSurfaceUrl(trimmed, 'terminal') },
      { id: 'pwa-approvals', label: 'Approvals', url: agentOsSurfaceUrl(trimmed, 'pwa-approvals') }
    ]
  }
  return [
    { id: 'chat', label: 'Chat', url: agentOsSurfaceUrl(trimmed, '/chat') },
    { id: 'hermes-webui', label: 'Hermes', url: joinOriginPath(trimmed, '/hermes-webui') }
  ]
}
