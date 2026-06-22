export type AgentId = "planner" | "code" | "security" | "test" | "review" | "deploy"

export type Permission =
  | "repo.read"
  | "repo.write"
  | "security.scan"
  | "tests.run"
  | "review.approve"
  | "deploy.release"

export type AgentStatus = "idle" | "planning" | "running" | "blocked" | "verified" | "approved"

export interface GuardianAgent {
  id: AgentId
  name: string
  shortName: string
  role: string
  description: string
  permissions: Permission[]
  terminalFunction: string
  status: AgentStatus
  accent: string
  risk: "low" | "medium" | "high"
}

export interface PipelineStep {
  id: string
  agentId: AgentId
  name: string
  permission: Permission
  status: "queued" | "running" | "passed" | "blocked" | "needs-approval"
  protectedAction: boolean
  score: number
  output: string
}

export interface SecurityFinding {
  id: string
  severity: "critical" | "high" | "medium" | "low"
  title: string
  location: string
  status: "open" | "fixed" | "accepted"
  owner: AgentId
  summary: string
}

export interface TestSignal {
  name: string
  suite: string
  status: "passed" | "failed" | "running"
  duration: string
  coverage: string
}

export interface DeploymentTarget {
  name: string
  provider: "Vercel" | "Render" | "GitHub"
  status: "ready" | "waiting" | "blocked"
  environment: string
  protectedBy: Permission
}

export interface AuditRecord {
  id: string
  ts: string
  actor: string
  agentId: AgentId
  action: string
  target: string
  status: "allowed" | "denied" | "simulated" | "approved"
  terminal3Mode: string
  proof: string
  summary: string
  metadata?: Record<string, unknown>
}

export const permissionLabels: Record<Permission, string> = {
  "repo.read": "Repository read",
  "repo.write": "Repository write",
  "security.scan": "Security scan",
  "tests.run": "Test execution",
  "review.approve": "Review approval",
  "deploy.release": "Production deploy",
}

export const agents: GuardianAgent[] = [
  {
    id: "planner",
    name: "Planner Agent",
    shortName: "PLAN",
    role: "Breaks user intent into scoped engineering tasks",
    description: "Builds the execution plan, repo impact map, and Terminal3 permission envelope before code changes begin.",
    permissions: ["repo.read"],
    terminalFunction: "plan",
    status: "verified",
    accent: "#ea580c",
    risk: "low",
  },
  {
    id: "code",
    name: "Code Agent",
    shortName: "CODE",
    role: "Implements changes in isolated patches",
    description: "Produces minimal diffs and requests a signed write delegation before touching protected source paths.",
    permissions: ["repo.read", "repo.write"],
    terminalFunction: "code",
    status: "running",
    accent: "#0f766e",
    risk: "medium",
  },
  {
    id: "security",
    name: "Security Agent",
    shortName: "SEC",
    role: "Reviews secrets, auth, dependencies, and exploit paths",
    description: "Runs security gates and blocks deployment until critical findings are closed or explicitly accepted.",
    permissions: ["repo.read", "security.scan"],
    terminalFunction: "scan",
    status: "verified",
    accent: "#be123c",
    risk: "high",
  },
  {
    id: "test",
    name: "Test Agent",
    shortName: "TEST",
    role: "Runs unit, integration, and smoke tests",
    description: "Executes test suites, records coverage, and adds Terminal3 audit entries for the exact command set.",
    permissions: ["repo.read", "tests.run"],
    terminalFunction: "test",
    status: "verified",
    accent: "#2563eb",
    risk: "medium",
  },
  {
    id: "review",
    name: "Review Agent",
    shortName: "REV",
    role: "Summarizes diffs and final release risk",
    description: "Checks the plan, code, security, and tests before asking for a human approval signature.",
    permissions: ["repo.read", "review.approve"],
    terminalFunction: "review",
    status: "idle",
    accent: "#7c3aed",
    risk: "medium",
  },
  {
    id: "deploy",
    name: "Deploy Agent",
    shortName: "SHIP",
    role: "Ships approved changes to production targets",
    description: "Requires explicit human approval plus a Terminal3 deploy.release delegation before production release.",
    permissions: ["deploy.release"],
    terminalFunction: "deploy",
    status: "blocked",
    accent: "#ca8a04",
    risk: "high",
  },
]

export const defaultPipeline: PipelineStep[] = [
  {
    id: "intent-plan",
    agentId: "planner",
    name: "Intent decomposition",
    permission: "repo.read",
    status: "passed",
    protectedAction: false,
    score: 94,
    output: "Mapped the request into repository, auth, test, and deployment tasks.",
  },
  {
    id: "code-change",
    agentId: "code",
    name: "Patch proposal",
    permission: "repo.write",
    status: "passed",
    protectedAction: true,
    score: 88,
    output: "Prepared a minimal implementation patch and signed the write request.",
  },
  {
    id: "security-gate",
    agentId: "security",
    name: "Security gate",
    permission: "security.scan",
    status: "passed",
    protectedAction: true,
    score: 91,
    output: "No hard-coded secrets, unsafe token storage, or missing auth checks detected.",
  },
  {
    id: "test-run",
    agentId: "test",
    name: "Test execution",
    permission: "tests.run",
    status: "passed",
    protectedAction: true,
    score: 89,
    output: "Unit, integration, and browser smoke suites completed with release evidence.",
  },
  {
    id: "review-signoff",
    agentId: "review",
    name: "Review sign-off",
    permission: "review.approve",
    status: "needs-approval",
    protectedAction: true,
    score: 86,
    output: "Ready for human approval. Deploy remains blocked until Terminal3 verifies release scope.",
  },
]

export const securityFindings: SecurityFinding[] = [
  {
    id: "SEC-1024",
    severity: "high",
    title: "Privileged APIs require operator token",
    location: "app/api/**/route.ts",
    status: "fixed",
    owner: "security",
    summary: "Agent runs, repository scans, deploy approvals, and audit reads now require DEVGUARDIAN_OPERATOR_TOKEN.",
  },
  {
    id: "SEC-1041",
    severity: "medium",
    title: "Request validation and payload limits enforced",
    location: "lib/api-guard.ts",
    status: "fixed",
    owner: "planner",
    summary: "Protected routes reject malformed JSON, oversized bodies, invalid URLs, and unknown audit fields.",
  },
  {
    id: "SEC-1099",
    severity: "low",
    title: "Audit store fails closed in production",
    location: "audit_events",
    status: "fixed",
    owner: "security",
    summary: "MongoDB is required in production; in-memory audit fallback is limited to local/demo runtimes.",
  },
]

export const testSignals: TestSignal[] = [
  { name: "npm run lint", suite: "typecheck", status: "passed", duration: "local", coverage: "tsc --noEmit" },
  { name: "npm test", suite: "smoke", status: "passed", duration: "local", coverage: "api guards" },
  { name: "npm run build", suite: "release", status: "passed", duration: "local", coverage: "Next production" },
  { name: "browser smoke", suite: "rendered", status: "passed", duration: "local", coverage: "desktop/mobile" },
]

export const deploymentTargets: DeploymentTarget[] = [
  {
    name: "Frontend application",
    provider: "Vercel",
    status: "ready",
    environment: "production",
    protectedBy: "review.approve",
  },
  {
    name: "Agent API backend",
    provider: "Render",
    status: "ready",
    environment: "production",
    protectedBy: "deploy.release",
  },
  {
    name: "Release provenance",
    provider: "GitHub",
    status: "waiting",
    environment: "main",
    protectedBy: "repo.write",
  },
]

export const repositoryFiles = [
  { path: "app/api/agent/run/route.ts", owner: "planner", risk: "medium", status: "protected" },
  { path: "lib/terminal3.ts", owner: "security", risk: "high", status: "protected" },
  { path: "components/workspace/chat-workspace.tsx", owner: "code", risk: "low", status: "tracked" },
  { path: "app/deployments/page.tsx", owner: "deploy", risk: "high", status: "approval-required" },
]

export const seedAuditRecords: AuditRecord[] = [
  {
    id: "evt_001",
    ts: "2026-06-21T10:12:04.000Z",
    actor: "Planner Agent",
    agentId: "planner",
    action: "plan",
    target: "github:demo/repository",
    status: "allowed",
    terminal3Mode: "delegated",
    proof: "t3n:plan:verified",
    summary: "Read repository structure and generated an implementation plan.",
  },
  {
    id: "evt_002",
    ts: "2026-06-21T10:14:31.000Z",
    actor: "Security Agent",
    agentId: "security",
    action: "security.scan",
    target: "auth/session",
    status: "allowed",
    terminal3Mode: "delegated",
    proof: "t3n:scan:verified",
    summary: "Validated JWT session boundaries and blocked secret exposure.",
  },
  {
    id: "evt_003",
    ts: "2026-06-21T10:17:59.000Z",
    actor: "Deploy Agent",
    agentId: "deploy",
    action: "deploy.release",
    target: "production",
    status: "denied",
    terminal3Mode: "delegated",
    proof: "t3n:deploy:needs-human",
    summary: "Production deploy was blocked because human approval was missing.",
  },
]

export function getAgent(id: AgentId) {
  return agents.find((agent) => agent.id === id)
}

export function formatRelativeRisk(risk: GuardianAgent["risk"]) {
  if (risk === "high") return "Requires approval"
  if (risk === "medium") return "Scoped delegation"
  return "Read-only"
}
