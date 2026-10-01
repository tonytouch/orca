/** Guest session for the OpenMuse page. Not the shared browser profile. */
export const OPENMUSE_PARTITION = 'persist:openmuse'

const CLIPBOARD_PERMISSIONS = new Set(['clipboard-read', 'clipboard-sanitized-write'])

function sameOrigin(requestOrigin: string, webOrigin: string): boolean {
  try {
    return new URL(requestOrigin).origin === new URL(webOrigin).origin
  } catch {
    return false
  }
}

/** Clipboard only, and only for the configured web origin. Microphone stays denied. */
export function openMusePermissionAllowed(
  permission: string,
  requestOrigin: string,
  webOrigin: string
): boolean {
  if (!webOrigin.trim() || !CLIPBOARD_PERMISSIONS.has(permission)) {
    return false
  }
  return sameOrigin(requestOrigin, webOrigin)
}
