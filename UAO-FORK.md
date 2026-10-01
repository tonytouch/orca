# UAO fork

UAO is a personal build of [Orca](https://github.com/stablyai/orca) (MIT, Copyright (c) 2026 Lovecast Inc.). It is not distributed. This repository is `tonytouch/orca`.

Upstream Orca stays the base. Fork-only code lives under `uao/`. Files we had to edit in the upstream tree are listed in [`uao/TOUCHED-UPSTREAM.md`](uao/TOUCHED-UPSTREAM.md). Third-party licenses are in [`uao/THIRD-PARTY-NOTICES.md`](uao/THIRD-PARTY-NOTICES.md).

## What this fork changes

- The desktop app name is **UAO**, bundle id `com.tonytouch.uao`. The window title, About panel, menus, and tray say UAO. The command-line name and `orca://` pairing links stay as upstream wrote them. Most other in-app sentences still say Orca; rewriting them would fight every upstream release. Icons are still Orca's.
- In-app release-notes links open **https://github.com/tonytouch/orca/releases**. The updater feed uses the same repo when the app name is UAO.
- Agent OS is a remote page. The app attaches to `http://100.90.167.20:5050` (Hermes `:8787`, Omniroute `:20128`) and does not start a local backend unless you turn that on in Endpoints or set `AGENT_OS_LOCAL=1`. Tokens stay in the OS keychain. See [`uao/agent-os/README.md`](uao/agent-os/README.md).
- CloudRoom is another remote endpoint, `http://100.90.167.20:9840` by default. UAO does not install or start cloudroom-core. See [`uao/cloudroom/README.md`](uao/cloudroom/README.md).
- The command-line name is still `orca` / `orca-ide`. Renaming it would collide with a large upstream test surface and with GNOME's screen reader on Linux (`/usr/bin/orca`). The Arch package name is `uao`, so pacman does not install over that screen reader. The updater cache directory stays `orca-updater` because electron-builder derives it from the npm package name.
- The deep-link scheme stays `orca://` so the phone app can still pair.
- Auto-update reads **https://github.com/tonytouch/orca/releases**, not stablyai. Set `UAO_DISABLE_AUTO_UPDATE=1` to turn checks off.
- `pnpm run build:linux` writes an AppImage, a pacman package, and a tar.gz. `pnpm run build:mac` writes an unsigned dmg. Windows packaging and SignPath stay in the unused upstream config (`config/electron-builder.config.cjs`); UAO's config drops them.
- Android's package is `com.tonytouch.uao`. It does not use expo-updates. Its update check and the desktop "download APK" link point at this repo's GitHub releases. Push notifications need your own `google-services.json`; the upstream Firebase client was disconnected so the new package name does not pretend to be Orca's.

## Sync with upstream

```bash
git remote add upstream https://github.com/stablyai/orca.git
git fetch upstream
git checkout main
git rebase upstream/main
```

When rebase stops, fix the files in `uao/TOUCHED-UPSTREAM.md` first. Keep `uao/` as the overlay. Do not copy upstream's `publish.owner` (`stablyai`) back into `uao/electron-builder.config.cjs`.

A weekly GitHub Action (`.github/workflows/uao-upstream-sync.yml`) can open a **merge** pull request instead. Use that when you want a reviewable sync. Rebase yourself when you want a straight line of commits. If the action hits conflicts, the job fails and the branch is not pushed; finish the merge locally.

## Releases

1. Tag `vX.Y.Z` on the commit you want (the version in `package.json` should match).
2. The `UAO builds` workflow produces unsigned Linux and macOS artifacts, and an Android APK, and on a `v*` tag uploads the desktop files onto that GitHub release.
3. electron-updater looks for `latest-linux.yml` / `latest-mac.yml` on the **latest** GitHub release. Those files have to be attached to the release or the in-app check reports that nothing is available.
4. macOS will say the app is from an unidentified developer. Open System Settings → Privacy & Security and allow it, or right-click the app and choose Open the first time. There is no Apple notarization on this fork.
5. Android: download the APK from the release and sideload it. The first install from an unknown source needs the system "install unknown apps" permission.

`pnpm run build:win` still invokes upstream's Windows packager. Do not use it for UAO.
