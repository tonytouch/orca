export type CockpitApproval = {
  id: string
  tool: string
  primaryArg?: string
  reason?: string
  createdAt?: number
}

export type CockpitClient = {
  pendingApprovals: () => Promise<CockpitApproval[]>
  approvalHistory: () => Promise<CockpitApproval[]>
  decideApproval: (id: string, approved: boolean) => Promise<void>
}

export type CockpitQueue = {
  pending: CockpitApproval[]
  history: CockpitApproval[]
}

export function assertCockpitId(id: string): string {
  const trimmed = id.trim()
  if (!trimmed || trimmed.length > 200 || /[\s/\\]/.test(trimmed)) {
    throw new Error('That approval id cannot be decided.')
  }
  return trimmed
}

export async function loadCockpitQueue(client: CockpitClient): Promise<CockpitQueue> {
  const [pending, history] = await Promise.all([
    client.pendingApprovals(),
    client.approvalHistory()
  ])
  return { pending, history }
}

export async function decideCockpit(
  client: CockpitClient,
  id: string,
  approved: boolean
): Promise<void> {
  await client.decideApproval(assertCockpitId(id), approved)
}
