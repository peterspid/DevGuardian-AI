import { AppShell } from "@/components/app-shell"
import { securityFindings } from "@/lib/devguardian-data"

const severityClass = {
  critical: "bg-foreground text-background",
  high: "bg-[#be123c] text-white",
  medium: "bg-[#ea580c] text-white",
  low: "bg-muted text-foreground",
}

export default function SecurityPage() {
  return (
    <AppShell title="Security" eyebrow="// Risk gates">
      <section className="border-2 border-foreground bg-background">
        <div className="grid grid-cols-[110px_1fr_120px_100px] border-b-2 border-foreground px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Severity</span>
          <span>Finding</span>
          <span>Owner</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-border">
          {securityFindings.map((finding) => (
            <div key={finding.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[110px_1fr_120px_100px]">
              <span
                className={`inline-flex h-7 items-center justify-center px-2 text-[10px] uppercase tracking-[0.16em] ${severityClass[finding.severity]}`}
              >
                {finding.severity}
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {finding.id} / {finding.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{finding.summary}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{finding.location}</p>
              </div>
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{finding.owner}</span>
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{finding.status}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  )
}

