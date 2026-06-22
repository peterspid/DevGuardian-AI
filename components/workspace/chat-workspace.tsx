"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole, ShieldCheck } from "lucide-react"
import { operatorHeaders, parseApiResponse } from "@/lib/operator-token"

interface RunResult {
  summary: string
  review: string
  source: string
  model: string
  recommendedDiff: string[]
  pipeline: Array<{
    id: string
    name: string
    output: string
    score: number
    status: string
    agent: { name: string; shortName: string; accent: string }
    witness: {
      mode: string
      status: string
      requestHash: string
      credentialId: string
      terminal3Authenticated: boolean
      terminal3Error?: string
    }
  }>
}

const demoPrompt = "Add JWT authentication, include security tests, and prepare a guarded production deploy"

export function ChatWorkspace() {
  const [prompt, setPrompt] = useState(demoPrompt)
  const [repositoryUrl, setRepositoryUrl] = useState("https://github.com/terminal3/example-agent")
  const [result, setResult] = useState<RunResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function runAgent() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...operatorHeaders() },
        body: JSON.stringify({ prompt, repositoryUrl }),
      })
      setResult(await parseApiResponse<RunResult>(response))
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : "Agent run failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="border-2 border-foreground bg-background">
        <div className="border-b-2 border-foreground px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Agent command center</p>
        </div>
        <div className="space-y-5 p-4">
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Repository</span>
            <input
              value={repositoryUrl}
              onChange={(event) => setRepositoryUrl(event.target.value)}
              className="w-full border-2 border-foreground bg-background px-3 py-3 text-xs outline-none focus:bg-muted"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Request</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={8}
              className="w-full resize-none border-2 border-foreground bg-background px-3 py-3 text-sm leading-relaxed outline-none focus:bg-muted"
            />
          </label>
          <button
            onClick={runAgent}
            disabled={loading}
            className="inline-flex w-full items-center justify-between bg-foreground px-4 py-3 text-xs uppercase tracking-[0.18em] text-background disabled:opacity-60"
          >
            <span>{loading ? "Running guarded agents" : "Run DevGuardian"}</span>
            {loading ? <Clock3 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          </button>
          {error ? (
            <p className="border border-[#be123c] px-3 py-2 text-xs leading-relaxed text-[#be123c]">{error}</p>
          ) : null}
        </div>
      </section>

      <section className="border-2 border-foreground bg-background">
        <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Execution trace</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {result ? `${result.source}:${result.model}` : "idle"}
          </span>
        </div>
        <div className="p-4">
          {!result ? (
            <div className="flex min-h-[420px] flex-col justify-center gap-4 text-muted-foreground">
              <LockKeyhole size={28} className="text-[#ea580c]" />
              <p className="max-w-md text-sm leading-relaxed">
                Run the demo request to see planner, code, security, test, and review agents request Terminal3-scoped
                permissions before a deployment can be approved.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="border-b-2 border-foreground pb-4">
                <p className="text-sm font-semibold uppercase">{result.summary}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{result.review}</p>
              </div>
              <div className="space-y-3">
                {result.pipeline.map((step) => (
                  <div key={step.id} className="grid gap-3 border border-border p-3 md:grid-cols-[112px_1fr_132px]">
                    <div>
                      <span
                        className="inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-background"
                        style={{ backgroundColor: step.agent.accent }}
                      >
                        {step.agent.shortName}
                      </span>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{step.status}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{step.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.output}</p>
                      <p className="mt-2 truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        proof {step.witness.credentialId}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <span className="text-2xl font-bold tabular-nums">{step.score}</span>
                      {step.witness.status === "verified" ? (
                        <CheckCircle2 size={20} className="text-[#0f766e]" />
                      ) : (
                        <ShieldCheck size={20} className="text-[#ea580c]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 border-t-2 border-foreground pt-4 sm:grid-cols-2">
                {result.recommendedDiff.map((item) => (
                  <p key={item} className="border border-border px-3 py-2 text-xs text-muted-foreground">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
