import { app } from 'electron'
import { UAO_GITHUB_OWNER, UAO_GITHUB_REPO, UAO_PRODUCT_NAME } from '../shared/uao-product'

const UPSTREAM_OWNER = 'stablyai'
const UPSTREAM_REPO = 'orca'

function feedOwnerRepo(): { owner: string; repo: string } {
  if (isUaoRuntime()) {
    return { owner: UAO_GITHUB_OWNER, repo: UAO_GITHUB_REPO }
  }
  return { owner: UPSTREAM_OWNER, repo: UPSTREAM_REPO }
}

/** True when this process is the UAO app, so update checks must not use stablyai releases. */
export function isUaoRuntime(): boolean {
  try {
    return app?.getName?.() === UAO_PRODUCT_NAME
  } catch {
    return false
  }
}

export function activeLatestDownloadUrl(): string {
  const { owner, repo } = feedOwnerRepo()
  return `https://github.com/${owner}/${repo}/releases/latest/download`
}

export function activeAtomFeedUrl(): string {
  const { owner, repo } = feedOwnerRepo()
  return `https://github.com/${owner}/${repo}/releases.atom`
}

export function activeReleasesDownloadBase(): string {
  const { owner, repo } = feedOwnerRepo()
  return `https://github.com/${owner}/${repo}/releases/download`
}

/** New regex each call so a global expression cannot keep lastIndex across feeds. */
export function activeTagHrefPattern(): RegExp {
  const { owner, repo } = feedOwnerRepo()
  return new RegExp(`href="https://github\\.com/${owner}/${repo}/releases/tag/([^"]+)"`, 'g')
}

/** UAO publishes every channel to one repo. Other app names keep the upstream repo. */
export function activeReleaseRepo(upstreamRepo: string): string {
  if (!isUaoRuntime()) {
    return upstreamRepo
  }
  return `${UAO_GITHUB_OWNER}/${UAO_GITHUB_REPO}`
}
