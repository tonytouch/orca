import { afterEach, describe, expect, it, vi } from 'vitest'

const appState = vi.hoisted(() => ({
  name: 'UAO',
  throwOnGetName: false
}))

vi.mock('electron', () => ({
  app: {
    getName: () => {
      if (appState.throwOnGetName) {
        throw new Error('unavailable')
      }
      return appState.name
    }
  },
  net: { fetch: vi.fn() }
}))

import { getReleaseDownloadUrl } from './updater-prerelease-feed'
import {
  activeAtomFeedUrl,
  activeLatestDownloadUrl,
  activeReleaseRepo,
  isUaoRuntime
} from './uao-runtime'

describe('UAO update feed', () => {
  afterEach(() => {
    appState.name = 'UAO'
    appState.throwOnGetName = false
  })

  it('points the UAO app at tonytouch/orca', () => {
    expect(isUaoRuntime()).toBe(true)
    expect(activeLatestDownloadUrl()).toBe(
      'https://github.com/tonytouch/orca/releases/latest/download'
    )
    expect(activeAtomFeedUrl()).toBe('https://github.com/tonytouch/orca/releases.atom')
    expect(getReleaseDownloadUrl('v1.4.214')).toBe(
      'https://github.com/tonytouch/orca/releases/download/v1.4.214'
    )
    expect(activeReleaseRepo('stablyai/orca-hourly')).toBe('tonytouch/orca')
  })

  it('keeps the upstream feed when the app name is not UAO', () => {
    appState.name = 'Orca'
    expect(isUaoRuntime()).toBe(false)
    expect(activeLatestDownloadUrl()).toBe(
      'https://github.com/stablyai/orca/releases/latest/download'
    )
    expect(getReleaseDownloadUrl('v1.4.214')).toBe(
      'https://github.com/stablyai/orca/releases/download/v1.4.214'
    )
    expect(activeReleaseRepo('stablyai/orca-hourly')).toBe('stablyai/orca-hourly')
  })

  it('treats a missing Electron app name as upstream', () => {
    appState.throwOnGetName = true
    expect(isUaoRuntime()).toBe(false)
    expect(activeAtomFeedUrl()).toBe('https://github.com/stablyai/orca/releases.atom')
  })
})
