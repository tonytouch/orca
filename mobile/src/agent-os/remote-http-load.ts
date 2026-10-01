export function agentOsEmbedUrl(baseUrl: string, hash: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  if (!trimmed) {
    return ''
  }
  const fragment = hash.trim().replace(/^#/, '') || 'overview'
  return `${trimmed}/?embed=1#${fragment}`
}

function documentKey(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname === '/' || parsed.pathname === '' ? '/' : parsed.pathname
    return `${parsed.origin}${path}${parsed.search}`
  } catch {
    return url.split('#')[0] ?? url
  }
}

/** Main-frame HTTP failures only. A missing favicon must not replace the page. */
export function mainFrameHttpStatusFailure(
  pageUrl: string,
  event: { statusCode: number; url?: string; description?: string }
): string | null {
  if (event.statusCode < 400) {
    return null
  }
  const eventUrl = event.url?.trim()
  if (eventUrl && documentKey(eventUrl) !== documentKey(pageUrl)) {
    return null
  }
  const description = event.description?.trim()
  return description ? `HTTP ${event.statusCode}: ${description}` : `HTTP ${event.statusCode}`
}

export function describeProbeFailure(error: unknown, url: string, timedOut: boolean): string {
  if (timedOut) {
    return `Timed out connecting to ${url}`
  }
  if (error instanceof Error && error.message.trim() && error.name !== 'AbortError') {
    return error.message
  }
  return `Network request failed for ${url}`
}
