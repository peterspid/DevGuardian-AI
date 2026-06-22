import { NextResponse } from "next/server"
import {
  apiErrorResponse,
  auditRecordSchema,
  enforceRateLimit,
  parseJsonBody,
  requireOperator,
} from "@/lib/api-guard"
import { appendAuditRecord, listAuditRecords } from "@/lib/audit-store"
import type { AuditRecord } from "@/lib/devguardian-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    enforceRateLimit(request, "audit-read", { limit: 60, windowMs: 60_000 })
    requireOperator(request)

    const url = new URL(request.url)
    const limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit") || 80)))
    const records = await listAuditRecords(limit)
    return NextResponse.json({ records })
  } catch (error) {
    return apiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "audit-write", { limit: 20, windowMs: 60_000 })
    requireOperator(request)

    const body = await parseJsonBody(request, auditRecordSchema, { maxBytes: 5_000 })
    const record: AuditRecord = {
      id: body.id || `evt_${crypto.randomUUID()}`,
      ts: body.ts || new Date().toISOString(),
      actor: body.actor || "DevGuardian",
      agentId: body.agentId || "planner",
      action: body.action || "audit.write",
      target: body.target || "devguardian",
      status: body.status || "simulated",
      terminal3Mode: body.terminal3Mode || "demo",
      proof: body.proof || "local",
      summary: body.summary || "Audit event recorded.",
      metadata: body.metadata,
    }
    const saved = await appendAuditRecord(record)
    return NextResponse.json({ record: saved })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
