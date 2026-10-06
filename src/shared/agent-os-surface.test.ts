import { describe, expect, it } from 'vitest'
import { AGENT_OS_DEFAULT_BASE_URL, AGENT_OS_LEGACY_EMBED_BASE_URL } from './agent-os-endpoints'
import {
  agentOsPrimaryLinks,
  agentOsSurfaceKind,
  agentOsSurfaceUrl,
  httpSidecarUrl
} from './agent-os-surface'

describe('agent OS surface URL', () => {
  it('opens Chat on the Tailscale HTTPS front end', () => {
    expect(AGENT_OS_DEFAULT_BASE_URL).toBe('https://server.tail85e19.ts.net:8444')
    expect(agentOsSurfaceKind(AGENT_OS_DEFAULT_BASE_URL)).toBe('hash')
    expect(agentOsSurfaceUrl(AGENT_OS_DEFAULT_BASE_URL)).toBe(
      'https://server.tail85e19.ts.net:8444/#/chat'
    )
    expect(agentOsPrimaryLinks(AGENT_OS_DEFAULT_BASE_URL)[0]).toEqual({
      id: 'chat',
      label: 'Chat',
      url: 'https://server.tail85e19.ts.net:8444/#/chat'
    })
  })

  it('keeps an http Tailscale IP on the older embed UI', () => {
    expect(agentOsSurfaceKind(AGENT_OS_LEGACY_EMBED_BASE_URL)).toBe('embed')
    expect(agentOsSurfaceUrl('http://100.90.167.20:5050/', 'overview')).toBe(
      'http://100.90.167.20:5050/?embed=1#overview'
    )
    expect(agentOsSurfaceUrl('http://100.90.167.20:5050', '#terminal')).toBe(
      'http://100.90.167.20:5050/?embed=1#terminal'
    )
    expect(agentOsPrimaryLinks('http://10.0.0.8:5050')[0]?.url).toBe(
      'http://10.0.0.8:5050/?embed=1#overview'
    )
  })

  it('opens Chat when the same Tailscale IP serves the hash UI', () => {
    expect(agentOsSurfaceKind('http://100.90.167.20:8444')).toBe('hash')
    expect(agentOsSurfaceUrl('http://100.90.167.20:8444', '/chat')).toBe(
      'http://100.90.167.20:8444/#/chat'
    )
    expect(agentOsSurfaceUrl('https://server.tail85e19.ts.net:8444/#/chat')).toBe(
      'https://server.tail85e19.ts.net:8444/#/chat'
    )
    expect(httpSidecarUrl('http://100.90.167.20:8444', 8010, '')).toBe('http://100.90.167.20:8010')
    expect(httpSidecarUrl('https://server.tail85e19.ts.net:8444', 8010, '')).toBe(
      'http://server.tail85e19.ts.net:8010'
    )
    expect(
      httpSidecarUrl('https://server.tail85e19.ts.net:8444', 8010, 'https://agy.example:8010/')
    ).toBe('https://agy.example:8010')
  })
})
