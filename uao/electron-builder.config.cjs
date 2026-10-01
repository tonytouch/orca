const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const product = JSON.parse(readFileSync(join(__dirname, 'product.json'), 'utf8'))
const upstream = require('../config/electron-builder.config.cjs')

// Why: Windows packaging and SignPath live only on the upstream config. UAO does not ship Windows.
const { win: _win, nsis: _nsis, ...withoutWindows } = upstream
const linuxArm64 = process.env.ORCA_LINUX_ARM64_RELEASE === '1'

/** electron-builder config for the UAO fork. Upstream `config/electron-builder.config.cjs` stays intact. */
module.exports = {
  ...withoutWindows,
  appId: product.appId,
  productName: product.productName,
  protocols: [{ name: product.productName, schemes: ['orca'] }],
  // Why: this fork is unsigned. Upstream turns signing on when ORCA_MAC_RELEASE=1.
  forceCodeSigning: false,
  files: [...(upstream.files ?? []), '!uao{,/**/*}', '!UAO-FORK.md'],
  publish: {
    provider: 'github',
    owner: product.githubOwner,
    repo: product.githubRepo,
    releaseType: 'release'
  },
  mac: {
    ...upstream.mac,
    hardenedRuntime: false,
    notarize: false,
    identity: null,
    // Why: an arch list here is built in full when the CLI says `--mac` without a target name, so `--arm64` does not drop x64.
    // macos-latest only has arm64 natives installed.
    target: [
      {
        target: 'dmg',
        arch: ['arm64']
      }
    ]
  },
  dmg: {
    artifactName: 'uao-macos-${arch}.${ext}'
  },
  linux: {
    ...upstream.linux,
    executableName: product.linuxExecutableName,
    maintainer: product.githubOwner,
    syncDesktopName: true,
    // tar.gz has no config section. This names it; AppImage and pacman set their own.
    artifactName: 'uao-linux-${arch}.${ext}',
    target: ['AppImage', 'pacman', 'tar.gz'],
    desktop: {
      entry: {
        ...upstream.linux.desktop.entry,
        StartupWMClass: product.linuxExecutableName
      }
    }
  },
  appImage: {
    artifactName: linuxArm64 ? 'uao-linux-arm64.${ext}' : 'uao-linux.${ext}'
  },
  pacman: {
    // Why: package.json name stays `orca` for the CLI. fpm would publish that name and collide with GNOME Orca.
    packageName: product.linuxExecutableName,
    artifactName: 'uao-linux-${arch}.${ext}'
  }
}
