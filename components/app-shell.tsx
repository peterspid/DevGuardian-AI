import Link from "next/link"
import { Activity, Bot, Boxes, ClipboardCheck, GitBranch, LayoutDashboard, Rocket, ShieldCheck, Terminal } from "lucide-react"
import { OperatorTokenBar } from "@/components/operator-token-bar"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: Terminal },
  { href: "/repository", label: "Repository", icon: GitBranch },
  { href: "/security", label: "Security", icon: ShieldCheck },
  { href: "/tests", label: "Tests", icon: ClipboardCheck },
  { href: "/deployments", label: "Deploy", icon: Rocket },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/audit", label: "Audit", icon: Activity },
]

export function AppShell({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen dot-grid-bg">
      <header className="sticky top-0 z-30 border-b-2 border-foreground bg-background/90 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center bg-foreground text-background">
              <Boxes size={17} />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.16em]">DevGuardian AI</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                <item.icon size={13} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="hidden bg-foreground px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-background sm:inline-flex"
            >
              Run Agent
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              <item.icon size={13} />
              {item.label}
            </Link>
          ))}
        </nav>
        <OperatorTokenBar />
      </header>

      <main className="px-4 py-8 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 border-b-2 border-foreground pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
            <h1 className="font-pixel text-4xl uppercase text-foreground sm:text-5xl lg:text-6xl">{title}</h1>
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
            Terminal3-backed software engineering agents with scoped permissions, signed protected actions,
            and an auditable path from repo intent to production release.
          </p>
        </div>
        {children}
      </main>
    </div>
  )
}
