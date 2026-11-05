import type { Prisma, PrismaClient } from '../generated/prisma/client'
import { AppError } from '../lib/http'
import { TOOL_REGISTRY } from '../lib/tool-registry'

export { TOOL_REGISTRY, listAvailableTools } from '../lib/tool-registry'
export type { ToolDefinition } from '../lib/tool-registry'

type Db = PrismaClient | Prisma.TransactionClient

/**
 * The tool routes take an agent id, so ownership has to be checked here — not
 * only in the agent routes. Without this, any signed-in user could read or
 * change another tenant's tool permissions by guessing an id.
 */
async function findOwnedAgent(db: Db, userId: string, agentId: string): Promise<void> {
  const agent = await db.agent.findFirst({ where: { id: agentId, userId }, select: { id: true } })
  if (!agent) throw new AppError('NOT_FOUND', 'Agent not found.', 404)
}

export async function getAgentTools(db: Db, userId: string, agentId: string) {
  await findOwnedAgent(db, userId, agentId)
  return db.agentTool.findMany({ where: { agentId } })
}

export async function upsertAgentTool(
  db: Db,
  userId: string,
  agentId: string,
  toolName: string,
  patch: { enabled?: boolean; config?: Record<string, unknown> }
) {
  await findOwnedAgent(db, userId, agentId)
  if (!TOOL_REGISTRY.some((tool) => tool.name === toolName)) {
    throw new AppError('VALIDATION', `Unknown tool: ${toolName}`, 400)
  }
  return db.agentTool.upsert({
    where: { agentId_toolName: { agentId, toolName } },
    create: {
      agentId,
      toolName,
      enabled: patch.enabled ?? false,
      config: (patch.config ?? null) as Prisma.InputJsonValue,
    },
    update: {
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(patch.config !== undefined ? { config: patch.config as Prisma.InputJsonValue } : {}),
    },
  })
}
