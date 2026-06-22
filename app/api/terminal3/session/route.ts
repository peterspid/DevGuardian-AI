import { NextResponse } from "next/server"
import { apiErrorResponse, enforceRateLimit, getOperatorState } from "@/lib/api-guard"
import { getTerminal3Status } from "@/lib/terminal3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    enforceRateLimit(request, "terminal3-session", { limit: 80, windowMs: 60_000 })
    const operator = getOperatorState(request)
    const status = await getTerminal3Status(operator.authenticated)
    return NextResponse.json({
      ...status,
      operator,
    })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
