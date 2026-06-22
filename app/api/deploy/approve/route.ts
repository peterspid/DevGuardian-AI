import { NextResponse } from "next/server"
import {
  apiErrorResponse,
  deployApprovalSchema,
  enforceRateLimit,
  parseJsonBody,
  requireOperator,
} from "@/lib/api-guard"
import { appendAuditRecord } from "@/lib/audit-store"
import { verifyProtectedAction } from "@/lib/terminal3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "deploy-approve", { limit: 8, windowMs: 60_000 })
    requireOperator(request)

    const body = await parseJsonBody(request, deployApprovalSchema, { maxBytes: 2_000 })
    const { approved, target } = body
    const verification = await verifyProtectedAction({
      agentId: "deploy",
      permission: "deploy.release",
      action: "deploy.release",
      target,
    })

    const status = approved && verification.authorized ? "approved" : "denied"
    const record = await appendAuditRecord({
      id: `evt_${crypto.randomUUID()}`,
      ts: new Date().toISOString(),
      actor: "Deploy Agent",
      agentId: "deploy",
      action: "deploy.release",
      target,
      status,
      terminal3Mode: verification.witness.mode,
      proof: verification.witness.credentialId,
      summary: approved
        ? "Human approval captured and deploy.release delegation verified."
        : "Deploy approval denied. Production release remains blocked.",
      metadata: {
        notes: body.notes || "",
        requestHash: verification.witness.requestHash,
        terminal3Authenticated: verification.witness.terminal3Authenticated,
      },
    })

    return NextResponse.json({
      approved,
      status,
      record,
      terminal3: verification.terminal3,
      witness: verification.witness,
      deployment: {
        frontend: approved ? "ready-for-vercel-production" : "blocked",
        backend: approved ? "ready-for-render-production" : "blocked",
        target,
      },
    })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
