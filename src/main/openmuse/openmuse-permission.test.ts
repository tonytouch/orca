import { describe, expect, it } from 'vitest'
import { openMusePermissionAllowed } from '../../../uao/openmuse/openmuse-permission'

const WEB = 'http://100.90.167.20:8081'

describe('openMusePermissionAllowed', () => {
  it('allows clipboard only for the configured web origin', () => {
    expect(openMusePermissionAllowed('clipboard-read', `${WEB}/`, WEB)).toBe(true)
    expect(openMusePermissionAllowed('clipboard-sanitized-write', WEB, `${WEB}/index.html`)).toBe(
      true
    )
    expect(openMusePermissionAllowed('clipboard-read', 'http://evil.test', WEB)).toBe(false)
  })

  it('denies media and every other permission', () => {
    expect(openMusePermissionAllowed('media', WEB, WEB)).toBe(false)
    expect(openMusePermissionAllowed('display-capture', WEB, WEB)).toBe(false)
    expect(openMusePermissionAllowed('clipboard-read', WEB, '')).toBe(false)
    expect(openMusePermissionAllowed('geolocation', WEB, WEB)).toBe(false)
  })
})
