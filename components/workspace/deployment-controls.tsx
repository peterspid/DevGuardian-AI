"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Rocket, ShieldAlert } from "lucide-react"
import { operatorHeaders, parseApiResponse } from "@/lib/operator-token"

interface DeployResult {
  status: string
  deployment: { frontend: string; backend: string; target: string }
  witness: { mode: string; credentialId: string; requestHash: string; terminal3Authenticated: boolean }
}

export function DeploymentControls() {
  const [approved, setApproved] = useState(false)
  const [target, setTarget] = useState("production")
  const [notes, setNotes] = useState("Reviewed plan, tests, and security gates.")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DeployResult | null>(null)
  const [error, setError] = useState("")

  async function approveDeploy() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/deploy/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...operatorHeaders() },
        body: JSON.stringify({ approved, target, notes }),
      })
      setResult(await parseApiResponse<DeployResult>(response))
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : "Deploy approval failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="border-2 border-foreground bg-background">
      <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-3">
        <div className="flex items-center gap-3">
          <Rocket size={16} />
          <span className="text-[10px] uppercase tracking-[0.2em]">Deployment Gate</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">deploy.release</span>
      </div>
      <div className="grid gap-5 p-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Target</span>
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="w-full border-2 border-foreground bg-background px-3 py-3 text-xs outline-none focus:bg-muted"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Approval notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full resize-none border-2 border-foreground bg-background px-3 py-3 text-xs outline-none focus:bg-muted"
            />
          </label>
          <label className="flex items-center justify-between border-2 border-foreground px-3 py-3">
            <span className="text-xs uppercase tracking-[0.16em]">Human approval</span>
            <input
              type="checkbox"
              checked={approved}
              onChange={(event) => setApproved(event.target.checked)}
              className="h-5 w-5 accent-[#ea580c]"
            />
          </label>
          <button
            onClick={approveDeploy}
            disabled={loading}
            className="inline-flex w-full items-center justify-between bg-foreground px-4 py-3 text-xs uppercase tracking-[0.18em] text-background disabled:opacity-60"
          >
            Verify deploy gate
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
          </button>
          {error ? (
            <p className="border border-[#be123c] px-3 py-2 text-xs leading-relaxed text-[#be123c]">{error}</p>
          ) : null}
        </div>
        <div className="border border-border p-4">
          {!result ? (
            <div className="flex h-full min-h-[280px] flex-col justify-center gap-3 text-muted-foreground">
              <ShieldAlert size={24} className="text-[#ea580c]" />
              <p className="text-sm leading-relaxed">
                Deploy Agent is intentionally blocked until human approval and a Terminal3 deploy.release witness are present.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {result.status === "approved" ? (
                  <CheckCircle2 size={24} className="text-[#0f766e]" />
                ) : (
                  <ShieldAlert size={24} className="text-[#ea580c]" />
                )}
                <div>
                  <p className="text-sm font-semibold uppercase">{result.status}</p>
                  <p className="text-xs text-muted-foreground">{result.witness.mode}</p>
                </div>
              </div>
              {[
                ["Frontend", result.deployment.frontend],
                ["Backend", result.deployment.backend],
                ["Credential", result.witness.credentialId],
                ["Request hash", result.witness.requestHash],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-border pt-3">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="mt-1 break-all text-xs">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
