import { AppShell } from "@/components/app-shell"
import { AuditLogTable } from "@/components/workspace/audit-log-table"

export default function AuditPage() {
  return (
    <AppShell title="Audit Logs" eyebrow="// Signed action evidence">
      <AuditLogTable />
    </AppShell>
  )
}

