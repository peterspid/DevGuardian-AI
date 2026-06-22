import { NextResponse } from "next/server"
import {
  agentRunSchema,
  apiErrorResponse,
  enforceRateLimit,
  parseJsonBody,
  requireOperator,
} from "@/lib/api-guard"
import { appendAuditRecord } from "@/lib/audit-store"
import { agents, getAgent, type AgentId, type AuditRecord, type Permission } from "@/lib/devguardian-data"
import { orchestrateAgentRun } from "@/lib/openai-orchestrator"
import { verifyProtectedAction } from "@/lib/terminal3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const defaultPrompt = "Add JWT authentication with security tests and deploy approval"
const defaultRepositoryUrl = "https://github.com/demo/repository"
const permissionValues: Permission[] = [
  "repo.read",
  "repo.write",
  "security.scan",
  "tests.run",
  "review.approve",
  "deploy.release",
]

function normalizePermission(value: unknown, fallback: Permission) {
  return permissionValues.includes(value as Permission) ? (value as Permission) : fallback
}

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "agent-run", { limit: 12, windowMs: 60_000 })
    requireOperator(request)

    const body = await parseJsonBody(request, agentRunSchema, { maxBytes: 6_000 })
    const prompt = body.prompt || defaultPrompt
    const repositoryUrl = body.repositoryUrl || defaultRepositoryUrl
    const plan = await orchestrateAgentRun(prompt)

    const verifiedSteps = await Promise.all(
      plan.pipeline.slice(0, 8).map(async (step) => {
        const agent = getAgent(step.agentId as AgentId) || agents[0]
        const permission = normalizePermission(step.permission, agent.permissions[0] || "repo.read")
        const action = step.protectedAction ? permission : agent.terminalFunction
        const verification = await verifyProtectedAction({
          agentId: agent.id,
          permission,
          action,
          target: repositoryUrl,
        })

        const audit: AuditRecord = {
          id: `evt_${crypto.randomUUID()}`,
          ts: new Date().toISOString(),
          actor: agent.name,
          agentId: agent.id,
          action,
          target: repositoryUrl,
          status: verification.authorized ? "allowed" : "denied",
          terminal3Mode: verification.witness.mode,
          proof: verification.witness.credentialId,
          summary: step.output,
          metadata: {
            prompt,
            score: step.score,
            requestHash: verification.witness.requestHash,
            terminal3Authenticated: verification.witness.terminal3Authenticated,
          },
        }
        await appendAuditRecord(audit)

        return {
          ...step,
          agent,
          terminal3: verification.terminal3,
          witness: verification.witness,
          status: verification.authorized ? step.status : "blocked",
        }
      }),
    )

    return NextResponse.json({
      prompt,
      repositoryUrl,
      model: plan.model,
      source: plan.source,
      summary: plan.summary,
      review: plan.review,
      recommendedDiff: plan.recommendedDiff.slice(0, 8),
      pipeline: verifiedSteps,
    })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
