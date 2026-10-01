import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  applyAndroidCleartext,
  NETWORK_SECURITY_CONFIG_XML
} = require('../../plugins/android-cleartext-http.js')

describe('android cleartext http plugin', () => {
  it('permits cleartext in the manifest and the network security config', () => {
    const manifest = {
      manifest: {
        application: [{ $: { 'android:name': '.MainApplication' } }]
      }
    }
    applyAndroidCleartext(manifest)
    expect(manifest.manifest.application[0]?.$).toMatchObject({
      'android:usesCleartextTraffic': 'true',
      'android:networkSecurityConfig': '@xml/network_security_config'
    })
    expect(NETWORK_SECURITY_CONFIG_XML).toContain('cleartextTrafficPermitted="true"')
    expect(NETWORK_SECURITY_CONFIG_XML).toContain('<base-config')
  })
})
