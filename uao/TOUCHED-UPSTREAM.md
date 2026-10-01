# Upstream files this fork edits

New fork files live under `uao/`, `UAO-FORK.md`, and `.github/workflows/uao-*.yml`. They are not upstream conflicts unless upstream adds the same path.

These existing files are patched. On a rebase, expect conflicts here:

| File | Why |
| --- | --- |
| `package.json` | `productName` UAO, `desktopName` `uao` (Linux window grouping), homepage, author. `name` stays `orca` (CLI and updater cache). `build:mac` / `build:linux` go through the scripts below. `build:mac:release` is the unsigned UAO mac build. |
| `config/scripts/static-appimage-package-contract.cjs` | Also accepts `uao-linux.AppImage` and `uao-linux-arm64.AppImage`. The check still rejects any other filename. |
| `config/scripts/static-appimage-package-contract.test.mjs` | Covers those two filenames. |
| `src/renderer/index.html` | Window title. |
| `src/main/uao-runtime.ts` | Chooses tonytouch vs stablyai update URLs from the app name. New file; listed because updater imports it. |
| `src/shared/uao-product.ts` | Fork name, app id, GitHub repo. New file. |
| `src/main/updater-prerelease-feed.ts` | Atom feed and download URLs. |
| `src/main/updater/updater-setup.ts` | Feed URL, and `UAO_DISABLE_AUTO_UPDATE`. |
| `src/main/updater/updater-release-feed.ts` | Fallback feed URL. |
| `src/main/updater-release-builds.ts` | Release list API repo. |
| `config/scripts/build-linux-local.mjs` | UAO builder config; AppImage, pacman, tar.gz. |
| `config/scripts/build-linux-local.test.mjs` | Matches that command line. |
| `config/scripts/build-mac-local.mjs` | UAO builder config. |
| `config/scripts/mobile-web-bundle-packaging-workflow-contract.test.mjs` | Counts the UAO build jobs. |
| `mobile/app.json` | Display name UAO, Android package `com.tonytouch.uao`, no upstream Firebase file. |
| `mobile/src/app-update/github-release-update-source.ts` | Android update check repo. |
| `mobile/src/app-update/app-update-sources.test.ts` | Expected API host. |
| `mobile/src/components/ProtocolBlockScreen.tsx` | "Get the update" link. |
| `mobile/src/components/ProtocolBlockScreen.test.ts` | Same link. |
| `mobile/src/components/HostProtocolGate.test.ts` | Same link. |
| `src/renderer/src/components/mobile/mobile-platform-copy.ts` | Desktop page APK link. |
| `src/renderer/src/components/settings/MobileSettingsPane.tsx` | Settings APK link. |

`config/electron-builder.config.cjs` is **not** edited. UAO builds load `uao/electron-builder.config.cjs`, which wraps it. That keeps app id, targets, and the GitHub publish owner off the file upstream changes most often.

The in-app updater still contains the upstream URL strings as the fallback for an app whose name is not `UAO`. Packaged and dev UAO set `productName` to `UAO`, and those checks use `tonytouch/orca`.
