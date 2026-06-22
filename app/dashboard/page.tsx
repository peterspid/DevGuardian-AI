import { AppShell } from "@/components/app-shell"
import { Terminal3StatusPanel } from "@/components/workspace/terminal3-status-panel"
import { agents, deploymentTargets, securityFindings, testSignals } from "@/lib/devguardian-data"

export default function DashboardPage() {
  const verifiedAgents = agents.filter((agent) => agent.status === "verified").length
  const fixedFindings = securityFindings.filter((finding) => finding.status !== "open").length
  const passingTests = testSignals.filter((test) => test.status === "passed").length

  return (
    <AppShell title="Dashboard" eyebrow="// Command overview">
      <div className="space-y-6">
        <Terminal3StatusPanel />
        <section className="grid gap-0 border-2 border-foreground bg-background md:grid-cols-4">
          {[
            ["Agents verified", `${verifiedAgents}/${agents.length}`],
            ["Security gates", `${fixedFindings}/${securityFindings.length}`],
            ["Test suites", `${passingTests}/${testSignals.length}`],
            ["Deploy targets", String(deploymentTargets.length)],
          ].map(([label, value]) => (
            <div key={label} className="border-b-2 border-foreground p-5 md:border-b-0 md:border-r-2 md:last:border-r-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
              <p className="mt-3 text-4xl font-bold tracking-tight">{value}</p>
            </div>
          ))}
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-2 border-foreground bg-background">
            <div className="border-b-2 border-foreground px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Active agent mesh
            </div>
            <div className="divide-y divide-border">
              {agents.map((agent) => (
                <div key={agent.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[96px_1fr_132px]">
                  <span
                    className="inline-flex h-8 items-center justify-center text-[10px] font-bold uppercase tracking-[0.18em] text-background"
                    style={{ backgroundColor: agent.accent }}
                  >
                    {agent.shortName}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{agent.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{agent.role}</p>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-right">{agent.status}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border-2 border-foreground bg-background">
            <div className="border-b-2 border-foreground px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Production readiness
            </div>
            <div className="divide-y divide-border">
              {deploymentTargets.map((target) => (
                <div key={target.name} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{target.name}</p>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{target.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {target.provider} / {target.environment} / protected by {target.protectedBy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

