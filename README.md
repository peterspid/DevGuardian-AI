# DevGuardian AI

DevGuardian AI is a production-oriented, Terminal3-verified multi-agent software engineering workspace. It turns a repository request into a guarded workflow across Planner, Code, Security, Test, Review, and Deploy agents, then records permission checks, Terminal3 delegation witnesses, and release decisions into an audit trail.

Live app: https://devguardian-ai.vercel.app

Render backend: https://devguardian-ai-backend.onrender.com

GitHub repository: https://github.com/imthegoodboy/DevGuardian-AI

Hackathon challenge: https://dorahacks.io/hackathon/t3adkdevchallenge/detail

The app was built for the Terminal3 ADK Developer Challenge:

- Completeness: landing page, dashboard, agent chat, repository scanner, security center, test center, deployment gate, agent monitor, audit trail, and production API routes.
- SDK integration: server-side `@terminal3/t3n-sdk` authentication, WASM loading, signed delegation credentials, signed invocation witnesses, usage/audit diagnostics, and protected agent action checks.
- Creativity: AI coding agents are treated as scoped actors. They can request `repo.read`, `repo.write`, `security.scan`, `tests.run`, `review.approve`, and `deploy.release`, but privileged routes require an operator token and Terminal3-backed witnesses.

## Problem The Agent Solves

Modern AI coding agents can plan, write, test, review, and deploy software, but teams still need to answer the hard production questions: who asked the agent to act, what permission did it use, which protected resource did it touch, and why was a release approved. Without that evidence, agent automation becomes difficult to trust in real engineering workflows.

DevGuardian AI solves that by acting as an auditable control plane for software engineering agents. It routes each task through specialized agents, maps every meaningful action to a scoped Terminal3 permission, creates signed evidence for protected operations, and stores the result in a reviewable audit trail before deployment is allowed.

## Why Verifiable Identity Matters

Verifiable identity is important because DevGuardian agents are not just chat assistants; they represent actors that can request repository access, run security checks, approve reviews, and prepare production releases. Every agent action needs a cryptographic identity and scoped permission boundary so the system can prove which agent acted, what it was allowed to do, and whether the request was authorized.

Terminal3 Agent Auth SDK gives DevGuardian that trust layer. Instead of relying on plain logs or UI claims, the app builds Terminal3-backed delegation witnesses for protected actions such as `repo.read`, `repo.write`, `security.scan`, `tests.run`, `review.approve`, and `deploy.release`. That makes the agent workflow accountable, inspectable, and safer for production use.

## What It Does

1. The operator enters a protected engineering request in `/chat`.
2. DevGuardian uses OpenAI when configured, with a deterministic fallback for offline demos.
3. Each agent step is mapped to a Terminal3 permission scope.
4. The server authenticates with Terminal3 and builds a delegation witness for protected actions.
5. Repository scans and agent runs append audit records to MongoDB.
6. The Deploy Agent stays blocked until a human approval plus `deploy.release` witness is present.
7. `/audit` shows the persisted release evidence for operator review.

## Pages

- `/` animated product landing page.
- `/dashboard` Terminal3 status, agent health, and production readiness.
- `/chat` guarded multi-agent command center.
- `/repository` GitHub repository scanner with `repo.read` witness.
- `/security` production security gates and fixed findings.
- `/tests` release verification signals.
- `/deployments` human approval and `deploy.release` verification.
- `/agents` agent identities, permissions, and risk levels.
- `/audit` protected audit log from MongoDB.

## Architecture

```text
frontend/
  app/                  Next.js pages and API routes
  app/api/*             Protected agent, audit, Terminal3, repo, and deploy APIs
  components/           UI shell, workspace panels, and shared controls
  lib/api-guard.ts      Operator token auth, rate limits, JSON validation, API errors
  lib/terminal3.ts      Terminal3 Agent Auth SDK adapter and witness builder
  lib/audit-store.ts    MongoDB audit persistence with local demo fallback
  lib/openai-orchestrator.ts
  public/               DevGuardian favicon, manifest, and social image
render.yaml             Render backend blueprint
```

The app is a single Next.js application. Vercel can host the frontend and API routes together, while Render can run the same Node runtime as a backend service.

## Terminal3 SDK Usage

`frontend/lib/terminal3.ts` keeps all Terminal3 secrets server-side and uses these SDK primitives:

- `setEnvironment`, `setNodeUrl`, and `getNodeUrl`
- `loadWasmComponent`
- `T3nClient`
- `eth_get_address`, `metamask_sign`, and `createEthAuthInput`
- `handshake`, `authenticate`, `getUsage`, and `getAuditEvents`
- `buildDelegationCredential`, `canonicaliseCredential`, and `signCredential`
- `buildInvocationPreimage`, `signAgentInvocation`, and `b64uEncodeBytes`

If Terminal3 credentials are missing or the sandbox node is unavailable, local development falls back to deterministic demo witnesses. Production protected actions still require `DEVGUARDIAN_OPERATOR_TOKEN`.

## Protected APIs

These routes require the operator token in `Authorization: Bearer <token>` or `x-devguardian-operator-token`:

- `POST /api/agent/run`
- `POST /api/repository/scan`
- `GET /api/audit`
- `POST /api/audit`
- `POST /api/deploy/approve`

`GET /api/terminal3/session` is safe for public health checks. It returns only redacted status by default and shows additional redacted diagnostics when the operator token is present.

The API guard also enforces request size limits, Zod body validation, structured errors, and in-memory rate limits.

## Environment

Create `frontend/.env.local` from `frontend/.env.example`.

```bash
cd frontend
cp .env.example .env.local
```

Required for production:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5

TERMINAL3_API_KEY=
TERMINAL3_PRIVATE_KEY=
TERMINAL3_DID=
TERMINAL3_ENVIRONMENT=testnet
TERMINAL3_NODE_URL=

MONGODB_URI=
MONGODB_DB=devguardian_ai

DEVGUARDIAN_OPERATOR_TOKEN=
DEVGUARDIAN_REQUIRE_OPERATOR_TOKEN=true
DEVGUARDIAN_ALLOW_MEMORY_AUDIT=false
NEXT_PUBLIC_APP_URL=https://devguardian-ai.vercel.app
```

Optional:

```bash
GITHUB_TOKEN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Do not commit `.env.local` or real secrets.

## Local Development

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open `http://localhost:3000`, save the same value as `DEVGUARDIAN_OPERATOR_TOKEN` in the app header, then run the protected workflows.

## Verification

```bash
cd frontend
npm run lint
npm test
npm run build
npm run qa
```

- `npm run lint` runs `tsc --noEmit`.
- `npm test` runs smoke checks for protected routes, Terminal3 redaction, metadata assets, and README coverage.
- `npm run build` validates the production Next.js build.
- `npm run qa` runs all three in order.

## Production

Vercel:

- Root directory: `frontend`
- Build command: `npm run build`
- Install command: `npm install --legacy-peer-deps`
- Output: `.next`

Render:

- Blueprint: `render.yaml`
- Service root: `frontend`
- Build: `npm install --legacy-peer-deps --include=dev && npm run build`
- Start: `npm run start -- -p $PORT`
- Health check: `/api/terminal3/session`

Current production targets:

- Frontend: https://devguardian-ai.vercel.app
- Render backend: https://devguardian-ai-backend.onrender.com

Set the same `DEVGUARDIAN_OPERATOR_TOKEN`, Terminal3, OpenAI, MongoDB, and optional GitHub values in both Vercel and Render so the frontend and backend behavior match.

## Useful Links

- Terminal3 ADK overview: https://docs.terminal3.io/developers/adk/overview/what-is-adk
- Terminal3 T3N overview: https://docs.terminal3.io/t3n/overview/what-is-t3n
- Terminal3 platform: https://docs.terminal3.io/intro/platform
- Terminal3 product page: https://www.terminal3.io/products/agent-developer-kit
