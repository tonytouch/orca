const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

// Why: the manifest flag is ignored once any network security config exists, and
// WebView still blocks http://100.x Tailscale IPs unless base-config allows cleartext.
const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`

function applyAndroidCleartext(androidManifest) {
  const application = androidManifest?.manifest?.application?.[0]
  if (!application) {
    throw new Error('AndroidManifest is missing an application element')
  }
  application.$ = {
    ...application.$,
    'android:usesCleartextTraffic': 'true',
    'android:networkSecurityConfig': '@xml/network_security_config'
  }
  return androidManifest
}

function withCleartextManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    applyAndroidCleartext(cfg.modResults)
    return cfg
  })
}

function withCleartextResource(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const directory = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      )
      await fs.promises.mkdir(directory, { recursive: true })
      await fs.promises.writeFile(
        path.join(directory, 'network_security_config.xml'),
        NETWORK_SECURITY_CONFIG_XML
      )
      return cfg
    }
  ])
}

function withAndroidCleartextHttp(config) {
  return withCleartextResource(withCleartextManifest(config))
}

module.exports = withAndroidCleartextHttp
module.exports.applyAndroidCleartext = applyAndroidCleartext
module.exports.NETWORK_SECURITY_CONFIG_XML = NETWORK_SECURITY_CONFIG_XML
