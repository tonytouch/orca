import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const config = require('../../uao/electron-builder.config.cjs')

describe('UAO electron-builder config', () => {
  it('uses a distinct app id and publishes to tonytouch/orca', () => {
    expect(config.appId).toBe('com.tonytouch.uao')
    expect(config.productName).toBe('UAO')
    expect(config.publish).toEqual({
      provider: 'github',
      owner: 'tonytouch',
      repo: 'orca',
      releaseType: 'release'
    })
    expect(JSON.stringify(config.publish)).not.toContain('stablyai')
  })

  it('builds an AppImage, a pacman package, a tar archive, and an unsigned macOS dmg', () => {
    expect(config.linux.target).toEqual(['AppImage', 'pacman', 'tar.gz'])
    expect(config.linux.executableName).toBe('uao')
    expect(config.mac.target).toEqual([{ target: 'dmg', arch: ['x64', 'arm64'] }])
    expect(config.mac.identity).toBeNull()
    expect(config.mac.notarize).toBe(false)
    expect(config.mac.hardenedRuntime).toBe(false)
    expect(config.forceCodeSigning).toBe(false)
  })

  it('drops Windows targets and SignPath signing', () => {
    expect(config.win).toBeUndefined()
    expect(config.nsis).toBeUndefined()
  })
})
