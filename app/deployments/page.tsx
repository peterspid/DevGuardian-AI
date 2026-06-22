import { AppShell } from "@/components/app-shell"
import { DeploymentControls } from "@/components/workspace/deployment-controls"
import { deploymentTargets } from "@/lib/devguardian-data"

export default function DeploymentsPage() {
  return (
    <AppShell title="Deployments" eyebrow="// Human approved release">
      <div className="space-y-6">
        <DeploymentControls />
        <section className="grid gap-0 border-2 border-foreground bg-background md:grid-cols-3">
          {deploymentTargets.map((target) => (
            <div key={target.name} className="border-b-2 border-foreground p-5 md:border-b-0 md:border-r-2 md:last:border-r-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{target.provider}</p>
              <p className="mt-3 text-sm font-semibold">{target.name}</p>
              <p className="mt-2 text-xs text-muted-foreground">{target.environment}</p>
              <p className="mt-5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{target.protectedBy}</p>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  )
}

