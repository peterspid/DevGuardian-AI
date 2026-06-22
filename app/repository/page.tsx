import { AppShell } from "@/components/app-shell"
import { RepositoryScanner } from "@/components/workspace/repository-scanner"

export default function RepositoryPage() {
  return (
    <AppShell title="Repository" eyebrow="// Protected source map">
      <RepositoryScanner />
    </AppShell>
  )
}

