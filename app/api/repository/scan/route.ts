import { NextResponse } from "next/server"
import {
  apiErrorResponse,
  enforceRateLimit,
  parseJsonBody,
  repositoryScanSchema,
  requireOperator,
} from "@/lib/api-guard"
import { appendAuditRecord } from "@/lib/audit-store"
import { scanRepository } from "@/lib/github-repository"
import { verifyProtectedAction } from "@/lib/terminal3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "repository-scan", { limit: 20, windowMs: 60_000 })
    requireOperator(request)

    const body = await parseJsonBody(request, repositoryScanSchema, { maxBytes: 1_500 })
    const scan = await scanRepository(body.repositoryUrl)
    const verification = await verifyProtectedAction({
      agentId: "planner",
      permission: "repo.read",
      action: "repo.read",
      target: scan.url,
    })

    await appendAuditRecord({
      id: `evt_${crypto.randomUUID()}`,
      ts: new Date().toISOString(),
      actor: "Planner Agent",
      agentId: "planner",
      action: "repo.read",
      target: scan.url,
      status: verification.authorized ? "allowed" : "denied",
      terminal3Mode: verification.witness.mode,
      proof: verification.witness.credentialId,
      summary: `${scan.source === "github" ? "Live GitHub" : "Demo"} repository inventory mapped for ${scan.owner}/${scan.name}.`,
      metadata: {
        requestHash: verification.witness.requestHash,
        terminal3Authenticated: verification.witness.terminal3Authenticated,
      },
    })

    return NextResponse.json({
      scan,
      terminal3: verification.terminal3,
      witness: verification.witness,
    })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
