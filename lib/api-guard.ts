import "server-only"

import { createHash, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z, ZodError, type ZodSchema } from "zod"

type RateLimitBucket = {
  count: number
  resetAt: number
}

type ErrorHeaders = Record<string, string>

const globalForApiGuard = globalThis as typeof globalThis & {
  __devguardianRateLimits?: Map<string, RateLimitBucket>
}

const DEFAULT_JSON_MAX_BYTES = 12_000

export class ApiRouteError extends Error {
  status: number
  code: string
  details?: unknown
  headers?: ErrorHeaders

  constructor(status: number, code: string, message: string, details?: unknown, headers?: ErrorHeaders) {
    super(message)
    this.name = "ApiRouteError"
    this.status = status
    this.code = code
    this.details = details
    this.headers = headers
  }
}

export const agentRunSchema = z
  .object({
    prompt: z.string().trim().max(2_000).optional(),
    repositoryUrl: z.preprocess(
      (value) => (typeof value === "string" && !value.trim() ? undefined : value),
      z.string().trim().url().max(320).optional(),
    ),
  })
  .strict()

export const repositoryScanSchema = z
  .object({
    repositoryUrl: z.string().trim().url().max(320),
  })
  .strict()

export const deployApprovalSchema = z
  .object({
    approved: z.boolean(),
    target: z.string().trim().min(2).max(80).regex(/^[a-z0-9._:/-]+$/i),
    notes: z.string().trim().max(500).optional(),
  })
  .strict()

export const auditRecordSchema = z
  .object({
    id: z.string().trim().min(4).max(80).optional(),
    ts: z.string().datetime().optional(),
    actor: z.string().trim().min(1).max(80).optional(),
    agentId: z.enum(["planner", "code", "security", "test", "review", "deploy"]).optional(),
    action: z.string().trim().min(1).max(80).optional(),
    target: z.string().trim().min(1).max(180).optional(),
    status: z.enum(["allowed", "denied", "simulated", "approved"]).optional(),
    terminal3Mode: z.string().trim().min(1).max(80).optional(),
    proof: z.string().trim().min(1).max(500).optional(),
    summary: z.string().trim().min(1).max(700).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()

function operatorTokenRequired() {
  const configured = process.env.DEVGUARDIAN_REQUIRE_OPERATOR_TOKEN
  if (configured) return configured !== "false"
  return process.env.NODE_ENV === "production"
}

function configuredOperatorToken() {
  return process.env.DEVGUARDIAN_OPERATOR_TOKEN?.trim() || ""
}

function extractOperatorToken(request: Request) {
  const auth = request.headers.get("authorization") || ""
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim()
  }
  return (
    request.headers.get("x-devguardian-operator-token")?.trim() ||
    request.headers.get("x-operator-token")?.trim() ||
    ""
  )
}

function safeTokenEquals(actual: string, expected: string) {
  if (!actual || !expected) return false
  const actualHash = createHash("sha256").update(actual).digest()
  const expectedHash = createHash("sha256").update(expected).digest()
  return timingSafeEqual(actualHash, expectedHash)
}

export function getOperatorState(request: Request) {
  const expected = configuredOperatorToken()
  const provided = extractOperatorToken(request)

  if (!expected) {
    return {
      configured: false,
      authenticated: !operatorTokenRequired(),
      mode: operatorTokenRequired() ? "missing" : "development-bypass",
    }
  }

  if (!provided) {
    return {
      configured: true,
      authenticated: false,
      mode: "not-provided",
    }
  }

  if (!safeTokenEquals(provided, expected)) {
    throw new ApiRouteError(401, "invalid_operator_token", "Operator token is invalid.")
  }

  return {
    configured: true,
    authenticated: true,
    mode: "operator",
  }
}

export function requireOperator(request: Request) {
  const state = getOperatorState(request)
  if (state.authenticated) return state

  if (!state.configured) {
    throw new ApiRouteError(
      503,
      "operator_token_not_configured",
      "Set DEVGUARDIAN_OPERATOR_TOKEN before using protected agent actions in production.",
    )
  }

  throw new ApiRouteError(401, "operator_token_required", "Enter the DevGuardian operator token to continue.")
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  options: { limit?: number; windowMs?: number } = {},
) {
  const limit = options.limit ?? 30
  const windowMs = options.windowMs ?? 60_000
  const now = Date.now()
  const ip = getClientIp(request)
  const key = `${scope}:${ip}`
  const store = (globalForApiGuard.__devguardianRateLimits ||= new Map<string, RateLimitBucket>())

  if (store.size > 5_000) {
    for (const [bucketKey, bucket] of store.entries()) {
      if (bucket.resetAt <= now) store.delete(bucketKey)
    }
  }

  const bucket = store.get(key)
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  bucket.count += 1
  if (bucket.count <= limit) return

  const retrySeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000))
  throw new ApiRouteError(
    429,
    "rate_limited",
    "Too many requests for this protected action. Try again shortly.",
    { scope, retrySeconds },
    { "Retry-After": String(retrySeconds) },
  )
}

export async function parseJsonBody<TSchema extends ZodSchema>(
  request: Request,
  schema: TSchema,
  options: { maxBytes?: number } = {},
): Promise<z.infer<TSchema>> {
  const contentType = request.headers.get("content-type") || ""
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiRouteError(415, "json_required", "Request body must be application/json.")
  }

  const text = await request.text()
  const maxBytes = options.maxBytes ?? DEFAULT_JSON_MAX_BYTES
  const bytes = new TextEncoder().encode(text).byteLength
  if (bytes > maxBytes) {
    throw new ApiRouteError(413, "payload_too_large", `Request body must be ${maxBytes} bytes or smaller.`)
  }

  let json: unknown
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new ApiRouteError(400, "invalid_json", "Request body contains invalid JSON.")
  }

  try {
    return schema.parse(json)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiRouteError(
        400,
        "invalid_request",
        "Request body failed validation.",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      )
    }
    throw error
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiRouteError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status, headers: error.headers },
    )
  }

  const routedError = error as { status?: number; code?: string; message?: string }
  if (typeof routedError.status === "number" && typeof routedError.code === "string") {
    return NextResponse.json(
      {
        error: {
          code: routedError.code,
          message: routedError.message || "Request failed.",
        },
      },
      { status: routedError.status },
    )
  }

  console.error("Unhandled DevGuardian API error", error)
  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message: "The request could not be completed.",
      },
    },
    { status: 500 },
  )
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown"
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-vercel-forwarded-for") ||
    "unknown"
  )
}
