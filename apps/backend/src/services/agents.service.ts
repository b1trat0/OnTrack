import type { AgentOutputType, Prisma, PrismaClient } from '../generated/prisma/client'
import { AppError } from '../lib/http'
import { seedDefaultAgents } from './seed.service'
import { TOOL_REGISTRY } from '../lib/tool-registry'

type Db = PrismaClient | Prisma.TransactionClient

const VALID_TOOL_NAMES = new Set(TOOL_REGISTRY.map((tool) => tool.name))

/** Reject a tool name the runner cannot execute, instead of storing a dead row. */
function assertValidTools(tools: string[]): void {
  const invalid = tools.filter((tool) => !VALID_TOOL_NAMES.has(tool))
  if (invalid.length > 0) {
    throw new AppError('VALIDATION', `Unknown tool: ${invalid.join(', ')}`, 400)
  }
}

async function findOwnedAgent(db: Db, userId: string, agentId: string) {
  const agent = await db.agent.findFirst({ where: { id: agentId, userId } })
  if (!agent) throw new AppError('NOT_FOUND', 'Agent not found.', 404)
  return agent
}

/** A model key is tenant data. An agent may only reference its owner's key. */
async function assertOwnedModelKey(db: Db, userId: string, keyId: string): Promise<void> {
  const key = await db.modelKey.findFirst({
    where: { id: keyId, userId },
    select: { id: true },
  })
  if (!key) throw new AppError('NOT_FOUND', 'Model key not found.', 404)
}

export async function listAgents(db: Db, userId: string) {
  const count = await db.agent.count({ where: { userId } })
  if (count === 0) await seedDefaultAgents(db, userId)
  return db.agent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { tools: true },
  })
}

export async function getAgent(db: Db, userId: string, agentId: string) {
  const agent = await db.agent.findFirst({
    where: { id: agentId, userId },
    include: { tools: true },
  })
  if (!agent) throw new AppError('NOT_FOUND', 'Agent not found.', 404)
  return agent
}

export async function createAgent(
  db: Db,
  userId: string,
  input: {
    name: string
    role: string
    icon: string
    color: string
    description: string
    preferences?: string[]
    templateId?: string
    prompt?: string
    sources?: string[]
    output?: AgentOutputType[]
    draftOnly?: boolean
    modelKeyId?: string | null
    maxTokens?: number
    tools?: string[]
  }
) {
  let role = input.role
  let prompt = input.prompt ?? null
  let sources = input.sources ?? []
  let output = input.output ?? []
  let defaultTools: string[] = []

  if (input.templateId) {
    const template = await db.agentTemplate.findUnique({ where: { id: input.templateId } })
    if (!template) throw new AppError('NOT_FOUND', 'Agent template not found.', 404)
    role = role || template.defaultRole
    prompt = prompt || template.defaultPrompt
    sources = sources.length > 0 ? sources : template.defaultSources
    if (output.length === 0) output = template.defaultOutput
    defaultTools = template.defaultTools
  }

  // An agent with no destination would silently drop every run's output, so the
  // inbox is the floor rather than "write nowhere".
  if (output.length === 0) output = ['message']

  // The editor's tool selection wins. Fall back to the template's defaults only
  // when the caller did not send a list at all. An explicit empty list means
  // "no tools", which is a valid choice.
  const tools = input.tools ?? defaultTools
  assertValidTools(tools)
  if (input.modelKeyId) await assertOwnedModelKey(db, userId, input.modelKeyId)

  return db.$transaction(async (tx) => {
    const agent = await tx.agent.create({
      data: {
        userId,
        templateId: input.templateId ?? null,
        name: input.name,
        role,
        icon: input.icon,
        color: input.color,
        description: input.description,
        preferences: input.preferences ?? [],
        prompt,
        sources,
        output,
        draftOnly: input.draftOnly ?? true,
        modelKeyId: input.modelKeyId ?? null,
        maxTokens: input.maxTokens ?? 2000,
      },
      include: { tools: true },
    })

    if (tools.length > 0) {
      await tx.agentTool.createMany({
        data: tools.map((toolName) => ({
          agentId: agent.id,
          toolName,
          enabled: true,
        })),
      })
    }

    return tx.agent.findUnique({ where: { id: agent.id }, include: { tools: true } })
  })
}

export async function updateAgent(
  db: Db,
  userId: string,
  agentId: string,
  patch: {
    name?: string
    role?: string
    icon?: string
    color?: string
    description?: string
    preferences?: string[]
    prompt?: string
    sources?: string[]
    output?: AgentOutputType[]
    draftOnly?: boolean
    modelKeyId?: string | null
    maxTokens?: number
    tools?: string[]
  }
) {
  await findOwnedAgent(db, userId, agentId)
  // Reject an empty set explicitly: it would make every future run a silent no-op.
  if (patch.output !== undefined && patch.output.length === 0) {
    throw new AppError('VALIDATION', 'Pick at least one place to deliver output.', 400)
  }
  if (patch.tools !== undefined) assertValidTools(patch.tools)
  if (patch.modelKeyId) await assertOwnedModelKey(db, userId, patch.modelKeyId)

  const { tools, ...agentPatch } = patch

  return db.$transaction(async (tx) => {
    await tx.agent.update({
      where: { id: agentId },
      data: agentPatch,
    })

    if (tools !== undefined) {
      // Disable first so a removed tool stops fetching immediately, then upsert
      // the selected set. Config is preserved for tools that stay enabled.
      await tx.agentTool.updateMany({
        where: { agentId, toolName: { notIn: tools } },
        data: { enabled: false },
      })
      for (const toolName of tools) {
        await tx.agentTool.upsert({
          where: { agentId_toolName: { agentId, toolName } },
          create: { agentId, toolName, enabled: true },
          update: { enabled: true },
        })
      }
    }

    return tx.agent.findUnique({ where: { id: agentId }, include: { tools: true } })
  })
}

export async function deleteAgent(db: Db, userId: string, agentId: string): Promise<void> {
  await findOwnedAgent(db, userId, agentId)
  await db.agent.delete({ where: { id: agentId } })
}
