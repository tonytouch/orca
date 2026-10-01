import { describe, expect, it } from 'vitest'
import {
  agentOsEmbedUrl,
  describeProbeFailure,
  mainFrameHttpStatusFailure
} from './remote-http-load'

describe('agentOsEmbedUrl', () => {
  it('loads the Tailscale host with an explicit path so Android can finish the navigation', () => {
    expect(agentOsEmbedUrl('http://100.90.167.20:5050', 'overview')).toBe(
      'http://100.90.167.20:5050/?embed=1#overview'
    )
    expect(agentOsEmbedUrl('http://100.90.167.20:5050/', '#terminal')).toBe(
      'http://100.90.167.20:5050/?embed=1#terminal'
    )
  })
})

describe('mainFrameHttpStatusFailure', () => {
  const page = 'http://100.90.167.20:5050/?embed=1#overview'

  it('reports the main document and ignores a different resource', () => {
    expect(
      mainFrameHttpStatusFailure(page, {
        statusCode: 502,
        url: 'http://100.90.167.20:5050/?embed=1',
        description: 'Bad Gateway'
      })
    ).toBe('HTTP 502: Bad Gateway')
    expect(
      mainFrameHttpStatusFailure(page, {
        statusCode: 404,
        url: 'http://100.90.167.20:5050/favicon.ico'
      })
    ).toBeNull()
    expect(mainFrameHttpStatusFailure(page, { statusCode: 200, url: page })).toBeNull()
  })

  it('treats a status with no URL as the page that failed to paint', () => {
    expect(mainFrameHttpStatusFailure(page, { statusCode: 500 })).toBe('HTTP 500')
  })
})

describe('describeProbeFailure', () => {
  it('names a timeout and a cleartext rejection', () => {
    expect(describeProbeFailure(new Error('aborted'), 'http://100.90.167.20:5050', true)).toBe(
      'Timed out connecting to http://100.90.167.20:5050'
    )
    expect(
      describeProbeFailure(
        new Error('Cleartext HTTP traffic to 100.90.167.20 not permitted'),
        'http://100.90.167.20:8081',
        false
      )
    ).toBe('Cleartext HTTP traffic to 100.90.167.20 not permitted')
  })
})
