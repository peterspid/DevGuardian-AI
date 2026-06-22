"use client"

import { useEffect, useState } from "react"
import { KeyRound, ShieldCheck, X } from "lucide-react"
import { getStoredOperatorToken, setStoredOperatorToken } from "@/lib/operator-token"

export function OperatorTokenBar() {
  const [token, setToken] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = getStoredOperatorToken()
    setToken(stored)
    setSaved(Boolean(stored))
  }, [])

  function saveToken() {
    setStoredOperatorToken(token)
    setSaved(Boolean(token.trim()))
  }

  function clearToken() {
    setToken("")
    setStoredOperatorToken("")
    setSaved(false)
  }

  return (
    <div className="border-b border-border bg-background/95 px-4 py-2 lg:px-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {saved ? <ShieldCheck size={14} className="text-[#0f766e]" /> : <KeyRound size={14} className="text-[#ea580c]" />}
          <span>{saved ? "Operator token active" : "Protected actions require operator token"}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <input
            aria-label="DevGuardian operator token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveToken()
            }}
            type="password"
            placeholder="DEVGUARDIAN_OPERATOR_TOKEN"
            className="min-w-0 flex-1 border border-border bg-background px-3 py-2 text-xs outline-none focus:border-foreground md:w-80"
          />
          <button
            type="button"
            onClick={saveToken}
            className="inline-flex h-9 items-center bg-foreground px-3 text-[10px] uppercase tracking-[0.16em] text-background"
          >
            Save
          </button>
          {saved ? (
            <button
              type="button"
              aria-label="Clear operator token"
              onClick={clearToken}
              className="inline-flex h-9 w-9 items-center justify-center border border-border"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
