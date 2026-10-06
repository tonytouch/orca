import { describe, expect, it } from 'vitest'
import { AGENT_OS_DEFAULT_ENDPOINTS } from '../../shared/agent-os-endpoints'
import { assertCockpitId } from '../../../uao/desktop-shell/cockpit-queue'
import {
  fetchPublishedPanes,
  parsePublishedPanes,
  uaoDesktopPanes,
  withPublishedPanes
} from '../../../uao/desktop-shell/uao-desktop-panes'
import { probeWorkstation, workstationTargets } from '../../../uao/desktop-shell/workstation-health'

describe('UAO desktop panes', () => {
  it('puts Chat first on the Tailscale HTTPS front end', () => {
    const panes = uaoDesktopPanes(AGENT_OS_DEFAULT_ENDPOINTS)
    expect(panes[0]).toMatchObject({
      id: 'chat',
      kind: 'page',
      url: 'https://server.tail85e19.ts.net:8444/#/chat'
    })
    expect(panes.map((pane) => pane.id)).toEqual([
      'chat',
      'hermes-webui',
      'cockpit',
      'omniroute',
      'antigravity',
      'workstation',
      'openmaic'
    ])
    const antigravity = panes.find((pane) => pane.id === 'antigravity')
    expect(antigravity).toMatchObject({ url: 'http://server.tail85e19.ts.net:8010' })
    const openmaic = panes.find((pane) => pane.id === 'openmaic')
    expect(openmaic).toMatchObject({ url: 'http://server.tail85e19.ts.net:3000' })
  })

  it('keeps the embed screens when the saved URL is an http Tailscale IP on 5050', () => {
    const panes = uaoDesktopPanes({
      ...AGENT_OS_DEFAULT_ENDPOINTS,
      baseUrl: 'http://100.90.167.20:5050',
      omnirouteUrl: 'http://100.90.167.20:20128',
      jarvisUrl: 'http://100.90.167.20:9443/hud'
    })
    expect(panes[0]).toMatchObject({
      id: 'overview',
      url: 'http://100.90.167.20:5050/?embed=1#overview'
    })
    expect(panes.find((pane) => pane.id === 'hermes-webui')).toMatchObject({
      url: 'http://100.90.167.20:5050/hermes-webui'
    })
    expect(panes.find((pane) => pane.id === 'antigravity')).toMatchObject({
      url: 'http://100.90.167.20:8010'
    })
    expect(panes.find((pane) => pane.id === 'jarvis')).toMatchObject({
      url: 'http://100.90.167.20:9443/hud'
    })
  })

  it('uses a saved sidecar URL and ignores a non-http published pane', () => {
    const panes = uaoDesktopPanes({
      ...AGENT_OS_DEFAULT_ENDPOINTS,
      antigravityUrl: 'http://10.1.1.9:8010/'
    })
    expect(panes.find((pane) => pane.id === 'antigravity')).toMatchObject({
      url: 'http://10.1.1.9:8010'
    })
    const published = parsePublishedPanes(
      {
        panes: [
          { id: 'notes', label: 'Notes', path: '/notes' },
          { id: 'bad', label: 'Bad', url: 'javascript:alert(1)' },
          { id: 'chat', title: 'Server chat', url: 'https://server.tail85e19.ts.net:8444/#/chat' }
        ]
      },
      AGENT_OS_DEFAULT_ENDPOINTS.baseUrl
    )
    expect(published.map((pane) => pane.id)).toEqual(['notes', 'chat'])
    const merged = withPublishedPanes(panes, published)
    expect(merged.find((pane) => pane.id === 'chat')).toMatchObject({ label: 'Server chat' })
    expect(merged.find((pane) => pane.id === 'notes')).toMatchObject({
      url: 'https://server.tail85e19.ts.net:8444/notes'
    })
  })

  it('rejects an approval id with a slash', () => {
    expect(assertCockpitId('tool-1')).toBe('tool-1')
    expect(() => assertCockpitId('../etc')).toThrow(/approval id/)
  })

  it('releases an unread health body and an unpublished pane list', async () => {
    const checks = await probeWorkstation(
      [{ id: 'healthz', label: 'Agent OS health', url: 'https://example.test/healthz' }],
      async () => new Response('busy', { status: 503 })
    )
    expect(checks[0]).toMatchObject({ state: 'down', detail: 'HTTP 503' })
    const panes = await fetchPublishedPanes(
      'https://example.test',
      null,
      async () => new Response('no', { status: 404 })
    )
    expect(panes).toEqual([])
  })

  it('checks Chat, the health route, and the sidecars', () => {
    const targets = workstationTargets(AGENT_OS_DEFAULT_ENDPOINTS)
    expect(targets.map((target) => target.id)).toContain('chat')
    expect(targets.find((target) => target.id === 'healthz')?.url).toBe(
      'https://server.tail85e19.ts.net:8444/healthz'
    )
    expect(targets.find((target) => target.id === 'antigravity')?.url).toBe(
      'http://server.tail85e19.ts.net:8010'
    )
  })
})
