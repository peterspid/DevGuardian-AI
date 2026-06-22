"use client"

import { useEffect, useState } from "react"
import type { AuditRecord } from "@/lib/devguardian-data"
import { OPERATOR_TOKEN_EVENT, operatorHeaders, parseApiResponse } from "@/lib/operator-token"

export function AuditLogTable() {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadRecords() {
      setError("")
      try {
        const response = await fetch("/api/audit", {
          headers: operatorHeaders(),
        })
        const data = await parseApiResponse<{ records: AuditRecord[] }>(response)
        if (active) setRecords(data.records || [])
      } catch (err) {
        if (active) {
          setRecords([])
          setError(err instanceof Error ? err.message : "Audit trail unavailable.")
        }
      }
    }

    loadRecords()
    window.addEventListener(OPERATOR_TOKEN_EVENT, loadRecords)
    return () => {
      active = false
      window.removeEventListener(OPERATOR_TOKEN_EVENT, loadRecords)
    }
  }, [])

  return (
    <section className="border-2 border-foreground bg-background">
      <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-3">
        <span className="text-[10px] uppercase tracking-[0.2em]">Audit Trail</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{records.length} events</span>
      </div>
      <div className="overflow-x-auto">
        {error ? (
          <p className="border-b border-border px-4 py-3 text-xs leading-relaxed text-[#be123c]">{error}</p>
        ) : null}
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-3 font-medium">Time</th>
              <th className="px-3 py-3 font-medium">Actor</th>
              <th className="px-3 py-3 font-medium">Action</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Proof</th>
              <th className="px-3 py-3 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-border last:border-b-0">
                <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                  {new Date(record.ts).toLocaleString()}
                </td>
                <td className="px-3 py-3">{record.actor}</td>
                <td className="px-3 py-3">{record.action}</td>
                <td className="px-3 py-3 uppercase text-muted-foreground">{record.status}</td>
                <td className="max-w-[180px] truncate px-3 py-3 text-muted-foreground">{record.proof}</td>
                <td className="min-w-[240px] px-3 py-3 text-muted-foreground">{record.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
