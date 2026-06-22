"use client"

import { useState } from "react"
import { GitBranch, Loader2, Search } from "lucide-react"
import { operatorHeaders, parseApiResponse } from "@/lib/operator-token"

interface RepoScan {
  source: string
  name: string
  owner: string
  url: string
  defaultBranch: string
  stars: number
  openIssues: number
  languages: Record<string, number>
  files: Array<{ path: string; owner: string; risk: string; status: string }>
  summary: string
}

export function RepositoryScanner() {
  const [repositoryUrl, setRepositoryUrl] = useState("https://github.com/terminal3/example-agent")
  const [scan, setScan] = useState<RepoScan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function runScan() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/repository/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...operatorHeaders() },
        body: JSON.stringify({ repositoryUrl }),
      })
      const payload = await parseApiResponse<{ scan: RepoScan }>(response)
      setScan(payload.scan)
    } catch (err) {
      setScan(null)
      setError(err instanceof Error ? err.message : "Repository scan failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="border-2 border-foreground bg-background">
      <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-3">
        <div className="flex items-center gap-3">
          <GitBranch size={16} />
          <span className="text-[10px] uppercase tracking-[0.2em]">Repository Explorer</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{scan?.source || "standby"}</span>
      </div>
      <div className="grid gap-5 p-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <input
            value={repositoryUrl}
            onChange={(event) => setRepositoryUrl(event.target.value)}
            className="w-full border-2 border-foreground bg-background px-3 py-3 text-xs outline-none focus:bg-muted"
          />
          <button
            onClick={runScan}
            disabled={loading}
            className="inline-flex w-full items-center justify-between bg-foreground px-4 py-3 text-xs uppercase tracking-[0.18em] text-background disabled:opacity-60"
          >
            Scan repository
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            The scan route uses a Terminal3 repo.read witness before mapping live GitHub metadata into protected files,
            ownership, and risk categories.
          </p>
          {error ? (
            <p className="border border-[#be123c] px-3 py-2 text-xs leading-relaxed text-[#be123c]">{error}</p>
          ) : null}
        </div>
        <div className="min-h-[300px] border border-border">
          {scan ? (
            <div>
              <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
                {[
                  ["Repo", `${scan.owner}/${scan.name}`],
                  ["Branch", scan.defaultBranch],
                  ["Stars", String(scan.stars)],
                  ["Issues", String(scan.openIssues)],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-r border-border p-3 sm:border-b-0 sm:last:border-r-0">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                    <p className="mt-1 truncate text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="border-b border-border p-3 text-xs leading-relaxed text-muted-foreground">{scan.summary}</p>
              <div className="divide-y divide-border">
                {scan.files.map((file) => (
                  <div key={file.path} className="grid grid-cols-[1fr_92px_92px] gap-3 px-3 py-3 text-xs">
                    <span className="truncate">{file.path}</span>
                    <span className="uppercase text-muted-foreground">{file.risk}</span>
                    <span className="uppercase text-muted-foreground">{file.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center px-6 text-center text-xs leading-relaxed text-muted-foreground">
              Enter a public GitHub URL and scan. Demo inventory is used if the repository is private or unavailable.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
