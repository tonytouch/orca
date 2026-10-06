/** Drop an unread fetch body so Node's HTTP parser cannot stall the process. */
export async function cancelUnreadHttpBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel()
  } catch {
    // Already closed.
  }
}
