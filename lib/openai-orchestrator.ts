import "server-only"

import { defaultPipeline, type AgentId, type Permission, type PipelineStep } from "@/lib/devguardian-data"

export interface OrchestratedPlan {
  model: string
  source: "openai" | "deterministic"
  summary: string
  pipeline: PipelineStep[]
  review: string
  recommendedDiff: string[]
}

function deterministicPlan(prompt: string): OrchestratedPlan {
  const normalized = prompt.trim() || "Add JWT authentication"
  return {
    model: "deterministic-fallback",
    source: "deterministic",
    summary: `DevGuardian decomposed "${normalized}" into a guarded implementation workflow with Terminal3-backed permissions.`,
    pipeline: defaultPipeline.map((step, index) => ({
      ...step,
      id: `${step.id}-${Date.now()}-${index}`,
      status: index < 4 ? "passed" : "needs-approval",
      output:
        index === 0
          ? `Planner scoped the request: ${normalized}.`
          : step.output,
    })),
    review: "Release is ready after human approval. Deploy Agent remains blocked until deploy.release is verified.",
    recommendedDiff: [
      "Add route-level auth middleware",
      "Store JWT verification config in server-only environment variables",
      "Add security tests for expired, malformed, and missing tokens",
      "Record Terminal3 audit evidence for repo.write and deploy.release",
    ],
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`OpenAI request timed out after ${ms}ms`)), ms)
    promise
      .then((value) => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeout)
        reject(error)
      })
  })
}

function extractJsonObject(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  if (!trimmed) return ""
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed

  const start = trimmed.indexOf("{")
  if (start === -1) return ""

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === "\\") {
      escaped = inString
      continue
    }
    if (char === "\"") {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === "{") depth += 1
    if (char === "}") depth -= 1
    if (depth === 0) return trimmed.slice(start, index + 1)
  }

  return ""
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback
}

function normalizePipeline(value: unknown, fallback: PipelineStep[]): PipelineStep[] {
  if (!Array.isArray(value) || value.length === 0) return fallback

  return fallback.map((baseStep, index) => {
    const item = value[index]
    if (!item || typeof item !== "object") return baseStep
    const record = item as Record<string, unknown>

    return {
      ...baseStep,
      id: stringValue(record.id) || `${baseStep.id}-${Date.now()}-${index}`,
      agentId: (stringValue(record.agentId) as AgentId) || baseStep.agentId,
      name: stringValue(record.name) || stringValue(record.task) || baseStep.name,
      permission: (stringValue(record.permission) as Permission) || baseStep.permission,
      status: baseStep.status,
      protectedAction:
        typeof record.protectedAction === "boolean" ? record.protectedAction : baseStep.protectedAction,
      score: numberValue(record.score, baseStep.score),
      output:
        stringValue(record.output) ||
        stringValue(record.result) ||
        stringValue(record.summary) ||
        baseStep.output,
    }
  })
}

function textArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  const normalized = value.map((item) => stringValue(item)).filter(Boolean).slice(0, 8)
  return normalized.length ? normalized : fallback
}

function parsePlan(text: string, prompt: string): OrchestratedPlan {
  const fallback = deterministicPlan(prompt)
  const jsonText = extractJsonObject(text)

  try {
    const parsed = JSON.parse(jsonText || text) as Partial<OrchestratedPlan>
    return {
      model: stringValue(parsed.model) || process.env.OPENAI_MODEL || "gpt-5.5",
      source: "openai",
      summary: stringValue(parsed.summary) || fallback.summary,
      pipeline: normalizePipeline(parsed.pipeline, fallback.pipeline),
      review: stringValue(parsed.review) || fallback.review,
      recommendedDiff: textArray(parsed.recommendedDiff, fallback.recommendedDiff),
    }
  } catch {
    return {
      ...fallback,
      source: "openai",
      review: text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
        .slice(0, 700) || fallback.review,
    }
  }
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return ""
  const data = payload as {
    output_text?: string
    output?: Array<{ content?: Array<{ text?: string; output_text?: string; type?: string }> }>
  }
  if (typeof data.output_text === "string") return data.output_text
  return (
    data.output
      ?.flatMap((item) => item.content || [])
      .map((content) => content.text || content.output_text || "")
      .filter(Boolean)
      .join("\n") || ""
  )
}

export async function orchestrateAgentRun(prompt: string): Promise<OrchestratedPlan> {
  if (!process.env.OPENAI_API_KEY) {
    return deterministicPlan(prompt)
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-5.5"
    const response = await withTimeout(
      fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "system",
              content:
                "You are DevGuardian AI, a multi-agent software engineering orchestrator. Return compact JSON only with keys: summary, review, recommendedDiff, pipeline. Pipeline items must keep these agentId values in order: planner, code, security, test, review.",
            },
            {
              role: "user",
              content: `Create a guarded engineering workflow for this request: ${prompt}`,
            },
          ],
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`)
        return res.json()
      }),
      16_000,
    )

    return parsePlan(extractResponseText(response), prompt)
  } catch {
    return deterministicPlan(prompt)
  }
}
