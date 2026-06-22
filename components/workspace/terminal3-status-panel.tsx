"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react"
import { OPERATOR_TOKEN_EVENT, operatorHeaders, parseApiResponse } from "@/lib/operator-token"

interface Terminal3Status {
  configured: boolean
  authenticated: boolean
  mode: string
  did: string
  tenantDid: string
  baseUrl?: string
  environment: string
  error?: string
  operator?: {
    configured: boolean
    authenticated: boolean
    mode: string
  }
  telemetry?: {
    usageAvailable: boolean
    auditAvailable: boolean
  }
}

export function Terminal3StatusPanel() {
  const [status, setStatus] = useState<Terminal3Status | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadStatus() {
      setLoading(true)
      try {
        const response = await fetch("/api/terminal3/session", {
          headers: operatorHeaders(),
        })
        const data = await parseApiResponse<Terminal3Status>(response)
        if (active) setStatus(data)
      } catch (err) {
        if (active) {
          setStatus({
            configured: false,
            authenticated: false,
            mode: "unavailable",
            did: "unknown",
            tenantDid: "unknown",
            environment: "testnet",
            error: err instanceof Error ? err.message : "Status request failed",
          })
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadStatus()
    window.addEventListener(OPERATOR_TOKEN_EVENT, loadStatus)
    return () => {
      active = false
      window.removeEventListener(OPERATOR_TOKEN_EVENT, loadStatus)
    }
  }, [])

  const live = Boolean(status?.authenticated)

  return (
    <section className="border-2 border-foreground bg-background">
      <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-3">
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-[#ea580c]" />
          ) : live ? (
            <CheckCircle2 size={16} className="text-[#0f766e]" />
          ) : (
            <ShieldAlert size={16} className="text-[#ea580c]" />
          )}
          <span className="text-[10px] uppercase tracking-[0.2em]">Terminal3 Agent Auth SDK</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {status?.mode || "loading"}
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-4">
        {[
          ["Environment", status?.environment || "testnet"],
          ["Authenticated", live ? "yes" : "fallback"],
          ["DID", status?.did || "pending"],
          ["Node", status?.baseUrl || (status?.operator?.authenticated ? "default" : "operator locked")],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-border px-4 py-4 md:border-b-0 md:border-r md:last:border-r-0">
            <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className="truncate text-xs font-semibold">{value}</p>
          </div>
        ))}
      </div>
      {status?.error ? (
        <p className="border-t border-border px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
          {status.error}
        </p>
      ) : null}
    </section>
  )
}
