import { AppShell } from "@/components/app-shell"
import { agents, formatRelativeRisk, permissionLabels } from "@/lib/devguardian-data"

export default function AgentsPage() {
  return (
    <AppShell title="Agent Monitor" eyebrow="// Identity and scope">
      <section className="grid gap-6 lg:grid-cols-2">
        {agents.map((agent) => (
          <article key={agent.id} className="border-2 border-foreground bg-background">
            <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-3">
              <span
                className="inline-flex h-7 items-center px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-background"
                style={{ backgroundColor: agent.accent }}
              >
                {agent.shortName}
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{agent.status}</span>
            </div>
            <div className="p-4">
              <p className="text-lg font-semibold uppercase">{agent.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{agent.description}</p>
              <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{formatRelativeRisk(agent.risk)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {agent.permissions.map((permission) => (
                  <span key={permission} className="border border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {permissionLabels[permission]}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  )
}

