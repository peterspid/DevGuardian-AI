import { AppShell } from "@/components/app-shell"
import { testSignals } from "@/lib/devguardian-data"

export default function TestsPage() {
  return (
    <AppShell title="Test Center" eyebrow="// Verified checks">
      <section className="border-2 border-foreground bg-background">
        <div className="grid grid-cols-[1fr_120px_120px_120px] border-b-2 border-foreground px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Suite</span>
          <span>Status</span>
          <span>Duration</span>
          <span>Coverage</span>
        </div>
        <div className="divide-y divide-border">
          {testSignals.map((test) => (
            <div key={test.name} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_120px_120px_120px]">
              <div>
                <p className="text-sm font-semibold">{test.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{test.suite}</p>
              </div>
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{test.status}</span>
              <span className="text-xs text-muted-foreground">{test.duration}</span>
              <span className="text-xs text-muted-foreground">{test.coverage}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  )
}

