import "server-only"

import { defaultPipeline, type PipelineStep } from "@/lib/devguardian-data"

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

function parsePlan(text: string, prompt: string): OrchestratedPlan {
  try {
    const parsed = JSON.parse(text) as Partial<OrchestratedPlan>
    return {
      model: parsed.model || process.env.OPENAI_MODEL || "gpt-5.5",
      source: "openai",
      summary: parsed.summary || deterministicPlan(prompt).summary,
      pipeline: parsed.pipeline?.length ? parsed.pipeline : deterministicPlan(prompt).pipeline,
      review: parsed.review || deterministicPlan(prompt).review,
      recommendedDiff: parsed.recommendedDiff?.length ? parsed.recommendedDiff : deterministicPlan(prompt).recommendedDiff,
    }
  } catch {
    return {
      ...deterministicPlan(prompt),
      source: "openai",
      review: text.slice(0, 700) || deterministicPlan(prompt).review,
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
