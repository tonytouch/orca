import { describe, expect, it } from 'vitest'
import {
  AGENT_OS_DEFAULT_BASE_URL,
  AGENT_OS_DEFAULT_HERMES_URL,
  AGENT_OS_DEFAULT_OMNIROUTE_URL,
  CLOUDROOM_DEFAULT_BASE_URL,
  parseAgentOsSavedEndpoints
} from './agent-os-endpoints'

describe('parseAgentOsSavedEndpoints', () => {
  it('keeps a legacy plain Agent OS URL and fills the other defaults', () => {
    expect(parseAgentOsSavedEndpoints('http://10.0.0.8:5050/')).toEqual({
      baseUrl: 'http://10.0.0.8:5050',
      hermesUrl: AGENT_OS_DEFAULT_HERMES_URL,
      omnirouteUrl: AGENT_OS_DEFAULT_OMNIROUTE_URL,
      cloudroomUrl: CLOUDROOM_DEFAULT_BASE_URL
    })
  })

  it('reads the three Tailscale URLs from JSON', () => {
    expect(
      parseAgentOsSavedEndpoints(
        JSON.stringify({
          baseUrl: 'http://100.90.167.20:5050',
          hermesUrl: 'http://100.90.167.20:8787',
          omnirouteUrl: 'http://100.90.167.20:20128'
        })
      )
    ).toEqual({
      baseUrl: AGENT_OS_DEFAULT_BASE_URL,
      hermesUrl: AGENT_OS_DEFAULT_HERMES_URL,
      omnirouteUrl: AGENT_OS_DEFAULT_OMNIROUTE_URL,
      cloudroomUrl: CLOUDROOM_DEFAULT_BASE_URL
    })
  })

  it('drops a non-http URL back to the default for that field', () => {
    expect(
      parseAgentOsSavedEndpoints(
        JSON.stringify({
          baseUrl: 'ftp://example.test',
          hermesUrl: 'not a url',
          omnirouteUrl: 'https://omni.example/route/'
        })
      )
    ).toEqual({
      baseUrl: AGENT_OS_DEFAULT_BASE_URL,
      hermesUrl: AGENT_OS_DEFAULT_HERMES_URL,
      omnirouteUrl: 'https://omni.example/route',
      cloudroomUrl: CLOUDROOM_DEFAULT_BASE_URL
    })
  })

  it('keeps an explicit empty CloudRoom URL and defaults a missing one', () => {
    expect(parseAgentOsSavedEndpoints(JSON.stringify({ cloudroomUrl: '' }))).toMatchObject({
      cloudroomUrl: ''
    })
    expect(
      parseAgentOsSavedEndpoints(JSON.stringify({ baseUrl: AGENT_OS_DEFAULT_BASE_URL }))
    ).toMatchObject({
      cloudroomUrl: CLOUDROOM_DEFAULT_BASE_URL
    })
  })

  it('returns null for empty storage', () => {
    expect(parseAgentOsSavedEndpoints(null)).toBeNull()
    expect(parseAgentOsSavedEndpoints('   ')).toBeNull()
    expect(parseAgentOsSavedEndpoints('{')).toBeNull()
  })
})
