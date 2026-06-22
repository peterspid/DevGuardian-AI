import { AppShell } from "@/components/app-shell"
import { ChatWorkspace } from "@/components/workspace/chat-workspace"

export default function ChatPage() {
  return (
    <AppShell title="Chat Workspace" eyebrow="// Guarded multi-agent run">
      <ChatWorkspace />
    </AppShell>
  )
}

