import "server-only"

import { createECDH, createHash, randomBytes } from "node:crypto"
import { agents, getAgent, type AgentId, type Permission } from "@/lib/devguardian-data"

type Environment = "testnet" | "production"

interface Terminal3AuthSession {
  configured: boolean
  authenticated: boolean
  mode: "live" | "demo" | "sdk-error"
  did: string
  tenantDid: string
  address?: string
  baseUrl?: string
  environment: Environment
  error?: string
  usage?: unknown
  audit?: unknown
  client?: unknown
}

export interface Terminal3Witness {
  mode: string
  actorDid: string
  tenantDid: string
  agentId: AgentId
  action: string
  permission: Permission
  authorized: boolean
  status: "verified" | "denied" | "simulated"
  requestHash: string
  credentialId: string
  credentialJcs?: string
  userSignature?: string
  agentSignature?: string
  agentPublicKey?: string
  nonce?: string
  terminalFunction: string
  terminal3Authenticated: boolean
  terminal3Error?: string
}

let cachedWasm: unknown
let cachedSession: Terminal3AuthSession | null = null
let cachedAt = 0

const SESSION_TTL_MS = 90_000
const FALLBACK_DID = "did:t3n:0000000000000000000000000000000000000001"

function envName(): Environment {
  return process.env.TERMINAL3_ENVIRONMENT === "production" ? "production" : "testnet"
}

function getPrivateKey() {
  const key = process.env.TERMINAL3_PRIVATE_KEY || process.env.TERMINAL3_API_KEY || ""
  if (!key) return ""
  return key.startsWith("0x") ? key : `0x${key}`
}

function getTenantDid() {
  return process.env.TERMINAL3_DID || FALLBACK_DID
}

function maskMiddle(value: string, leading = 16, trailing = 6) {
  if (!value) return "unknown"
  if (value.length <= leading + trailing + 3) return value
  return `${value.slice(0, leading)}...${value.slice(-trailing)}`
}

function publicSession(session: Terminal3AuthSession, options: { includeDiagnostics?: boolean } = {}) {
  const safe = {
    configured: session.configured,
    authenticated: session.authenticated,
    mode: session.mode,
    did: maskMiddle(session.did),
    tenantDid: maskMiddle(session.tenantDid),
    environment: session.environment,
    error: session.error,
  }

  if (!options.includeDiagnostics) return safe

  return {
    ...safe,
    address: session.address ? maskMiddle(session.address, 10, 6) : undefined,
    baseUrl: session.baseUrl,
    telemetry: {
      usageAvailable: Boolean(session.usage),
      auditAvailable: Boolean(session.audit),
    },
  }
}

function didFromSeed(seed: string) {
  return `did:t3n:${createHash("sha256").update(seed).digest("hex").slice(0, 40)}`
}

function sha256Bytes(input: string | Uint8Array) {
  return createHash("sha256").update(input).digest()
}

function hex(input: Uint8Array | Buffer) {
  return Buffer.from(input).toString("hex")
}

function base64Url(input: Uint8Array | Buffer) {
  return Buffer.from(input).toString("base64url")
}

function privateKeyBytes(key: string) {
  const normalized = key.replace(/^0x/, "")
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) return null
  return Uint8Array.from(Buffer.from(normalized, "hex"))
}

function deriveAgentSecret(agentId: AgentId, did: string) {
  return sha256Bytes(`devguardian-agent:${agentId}:${did}`)
}

function deriveAgentPublicKey(secret: Uint8Array) {
  const ecdh = createECDH("secp256k1")
  ecdh.setPrivateKey(Buffer.from(secret))
  return Uint8Array.from(ecdh.getPublicKey(undefined, "compressed"))
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise
      .then((value) => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeout)
        reject(error)
      })
  })
}

async function authenticateTerminal3(): Promise<Terminal3AuthSession> {
  const privateKey = getPrivateKey()
  const environment = envName()
  const tenantDid = getTenantDid()

  if (!privateKey) {
    return {
      configured: false,
      authenticated: false,
      mode: "demo",
      did: process.env.TERMINAL3_DID || didFromSeed("devguardian-demo-user"),
      tenantDid,
      environment,
      error: "Terminal3 private key is not configured in this runtime.",
    }
  }

  const now = Date.now()
  if (cachedSession && now - cachedAt < SESSION_TTL_MS) {
    return cachedSession
  }

  try {
    const sdk = await import("@terminal3/t3n-sdk")
    sdk.setEnvironment(environment)
    if (process.env.TERMINAL3_NODE_URL) {
      sdk.setNodeUrl(process.env.TERMINAL3_NODE_URL)
    }

    const baseUrl = sdk.getNodeUrl(process.env.TERMINAL3_NODE_URL)
    const address = sdk.eth_get_address(privateKey)
    cachedWasm =
      cachedWasm ||
      (await withTimeout(
        sdk.loadWasmComponent(),
        10_000,
        "Terminal3 WASM load",
      ))

    const client = new sdk.T3nClient({
      baseUrl,
      wasmComponent: cachedWasm as never,
      timeout: 12_000,
      handlers: {
        EthSign: sdk.metamask_sign(address, undefined, privateKey),
      },
    })

    await withTimeout(client.handshake(), 15_000, "Terminal3 handshake")
    const did = String(await withTimeout(client.authenticate(sdk.createEthAuthInput(address)), 15_000, "Terminal3 authentication"))

    let usage: unknown
    let audit: unknown
    try {
      usage = await withTimeout(client.getUsage({ limit: 8 }), 8_000, "Terminal3 usage read")
    } catch {
      usage = undefined
    }
    try {
      audit = await withTimeout(client.getAuditEvents({ limit: 8 }), 8_000, "Terminal3 audit read")
    } catch {
      audit = undefined
    }

    cachedSession = {
      configured: true,
      authenticated: true,
      mode: "live",
      did,
      tenantDid,
      address,
      baseUrl,
      environment,
      usage,
      audit,
      client,
    }
    cachedAt = now
    return cachedSession
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terminal3 SDK call failed"
    cachedSession = {
      configured: true,
      authenticated: false,
      mode: "sdk-error",
      did: process.env.TERMINAL3_DID || didFromSeed("devguardian-sdk-error-user"),
      tenantDid,
      environment,
      error: message,
    }
    cachedAt = now
    return cachedSession
  }
}

async function buildDelegationWitness(
  session: Terminal3AuthSession,
  agentId: AgentId,
  permission: Permission,
  action: string,
  target: string,
  authorized: boolean,
): Promise<Terminal3Witness> {
  const agent = getAgent(agentId)
  const terminalFunction = agent?.terminalFunction || action.replace(/[^a-z0-9]/g, "")
  const request = {
    app: "DevGuardian AI",
    agentId,
    action,
    target,
    permission,
    authorized,
    ts: new Date().toISOString(),
  }
  const requestHash = sha256Bytes(JSON.stringify(request))
  const credentialId = randomBytes(16)
  const nonce = randomBytes(16)
  const agentSecret = deriveAgentSecret(agentId, session.did)
  const agentPublicKey = deriveAgentPublicKey(agentSecret)
  const keyBytes = privateKeyBytes(getPrivateKey())

  if (!keyBytes) {
    return {
      mode: session.mode,
      actorDid: session.did,
      tenantDid: session.tenantDid,
      agentId,
      action,
      permission,
      authorized,
      status: authorized ? "simulated" : "denied",
      requestHash: hex(requestHash),
      credentialId: hex(credentialId),
      agentPublicKey: hex(agentPublicKey),
      nonce: hex(nonce),
      terminalFunction,
      terminal3Authenticated: session.authenticated,
      terminal3Error: session.error,
    }
  }

  try {
    const sdk = await import("@terminal3/t3n-sdk")
    const nowSecs = Math.floor(Date.now() / 1000)
    const credential = sdk.buildDelegationCredential({
      user_did: session.did || getTenantDid(),
      agent_pubkey: agentPublicKey,
      org_did: session.tenantDid || session.did || getTenantDid(),
      contract: "tee:devguardian",
      functions: [terminalFunction].sort(),
      scopes: [permission, "audit.write"],
      metadata: {
        app: "devguardian-ai",
        agent: agentId,
        permission,
        target: target.slice(0, 80),
      },
      not_before_secs: nowSecs - 30,
      not_after_secs: nowSecs + 60 * 15,
      vc_id: credentialId,
    })
    const credentialJcs = sdk.canonicaliseCredential(credential)
    const userSignature = sdk.signCredential(credentialJcs, keyBytes).sig
    const preimage = sdk.buildInvocationPreimage(credentialId, nonce, requestHash)
    const agentSignature = sdk.signAgentInvocation(preimage, agentSecret)

    return {
      mode: session.authenticated ? "live-delegation" : "local-delegation",
      actorDid: session.did,
      tenantDid: session.tenantDid,
      agentId,
      action,
      permission,
      authorized,
      status: authorized && session.authenticated ? "verified" : authorized ? "simulated" : "denied",
      requestHash: sdk.b64uEncodeBytes(requestHash),
      credentialId: sdk.b64uEncodeBytes(credentialId),
      credentialJcs: sdk.b64uEncodeBytes(credentialJcs),
      userSignature: sdk.b64uEncodeBytes(userSignature),
      agentSignature: sdk.b64uEncodeBytes(agentSignature),
      agentPublicKey: sdk.b64uEncodeBytes(agentPublicKey),
      nonce: sdk.b64uEncodeBytes(nonce),
      terminalFunction,
      terminal3Authenticated: session.authenticated,
      terminal3Error: session.error,
    }
  } catch (error) {
    return {
      mode: "delegation-error",
      actorDid: session.did,
      tenantDid: session.tenantDid,
      agentId,
      action,
      permission,
      authorized,
      status: authorized ? "simulated" : "denied",
      requestHash: base64Url(requestHash),
      credentialId: base64Url(credentialId),
      agentPublicKey: base64Url(agentPublicKey),
      nonce: base64Url(nonce),
      terminalFunction,
      terminal3Authenticated: session.authenticated,
      terminal3Error: error instanceof Error ? error.message : "Delegation witness generation failed",
    }
  }
}

export async function getTerminal3Status(includeDiagnostics = false) {
  const session = await authenticateTerminal3()
  return publicSession(session, { includeDiagnostics })
}

export async function verifyProtectedAction(input: {
  agentId: AgentId
  permission: Permission
  action: string
  target: string
}) {
  const agent = agents.find((item) => item.id === input.agentId)
  const authorized = Boolean(agent?.permissions.includes(input.permission))
  const session = await authenticateTerminal3()
  const witness = await buildDelegationWitness(
    session,
    input.agentId,
    input.permission,
    input.action,
    input.target,
    authorized,
  )

  return {
    authorized,
    terminal3: publicSession(session, { includeDiagnostics: true }),
    witness,
  }
}
