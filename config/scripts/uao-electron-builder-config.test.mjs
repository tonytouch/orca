import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const config = require('../../uao/electron-builder.config.cjs')
const uaoBuildWorkflow = readFileSync(
  fileURLToPath(new URL('../../.github/workflows/uao-build.yml', import.meta.url)),
  'utf8'
)

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
    expect(config.linux.syncDesktopName).toBe(true)
    expect(config.linux.artifactName).toBe('uao-linux-${arch}.${ext}')
    expect(config.pacman.packageName).toBe('uao')
    expect(config.mac.target).toEqual([{ target: 'dmg', arch: ['arm64'] }])
    expect(config.mac.identity).toBeNull()
    expect(config.mac.notarize).toBe(false)
    expect(config.mac.hardenedRuntime).toBe(false)
    expect(config.forceCodeSigning).toBe(false)
  })

  it('drops Windows targets and SignPath signing', () => {
    expect(config.win).toBeUndefined()
    expect(config.nsis).toBeUndefined()
  })

  it('packages on a tag without publishing, and builds only the arm64 dmg', () => {
    expect(uaoBuildWorkflow).toContain(
      'pnpm exec electron-builder --config uao/electron-builder.config.cjs --linux AppImage pacman tar.gz --x64 --publish never'
    )
    expect(uaoBuildWorkflow).toContain(
      'pnpm exec electron-builder --config uao/electron-builder.config.cjs --mac dmg --arm64 --publish never'
    )
    expect(uaoBuildWorkflow).not.toContain('GH_TOKEN: ${{ secrets.')
  })
})
