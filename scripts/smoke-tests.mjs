import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function read(relativePath) {
  return readFileSync(path.join(frontendRoot, relativePath), "utf8")
}

function assertIncludes(filePath, patterns) {
  const source = read(filePath)
  for (const pattern of patterns) {
    assert.match(source, pattern, `${filePath} must include ${pattern}`)
  }
}

assertIncludes("app/api/agent/run/route.ts", [/requireOperator\(request\)/, /parseJsonBody/, /enforceRateLimit/])
assertIncludes("app/api/deploy/approve/route.ts", [/requireOperator\(request\)/, /deployApprovalSchema/, /enforceRateLimit/])
assertIncludes("app/api/repository/scan/route.ts", [/requireOperator\(request\)/, /repositoryScanSchema/, /appendAuditRecord/])
assertIncludes("app/api/audit/route.ts", [/requireOperator\(request\)/, /auditRecordSchema/, /enforceRateLimit/])
assertIncludes("app/api/terminal3/session/route.ts", [/getOperatorState/, /getTerminal3Status\(operator\.authenticated\)/])
assertIncludes("lib/audit-store.ts", [/projection: \{ _id: 0 \}/, /AuditStoreUnavailableError/, /NODE_ENV !== "production"/])

const guard = read("lib/api-guard.ts")
assert.match(guard, /DEVGUARDIAN_OPERATOR_TOKEN/, "API guard must use the operator token env var")
assert.match(guard, /timingSafeEqual/, "API guard must compare tokens in constant time")
assert.match(guard, /payload_too_large/, "API guard must reject oversized JSON payloads")

const terminal3 = read("lib/terminal3.ts")
assert.match(terminal3, /maskMiddle/, "Terminal3 status must mask DID and address values")
assert.doesNotMatch(terminal3, /return safe\s*}\s*$/, "Terminal3 status must not return the raw session object")

const packageJson = JSON.parse(read("package.json"))
assert.equal(packageJson.scripts.lint, "npm run typecheck", "lint script must run the TypeScript checker")
assert.equal(packageJson.scripts.test, "node scripts/smoke-tests.mjs", "test script must run smoke tests")

const readme = readFileSync(path.join(frontendRoot, "README.md"), "utf8")
assert.match(readme, /DEVGUARDIAN_OPERATOR_TOKEN/, "README must document operator token setup")
assert.match(readme, /What It Does/, "README must describe what the app does")
assert.match(readme, /Problem The Agent Solves/, "README must include the challenge problem answer")
assert.match(readme, /Why Verifiable Identity Matters/, "README must include the verifiable identity answer")
assert.match(readme, /https:\/\/devguardian-ai\.vercel\.app/, "README must link to the branded production URL")

for (const asset of ["public/icon.svg", "public/site.webmanifest"]) {
  assert.equal(existsSync(path.join(frontendRoot, asset)), true, `${asset} must exist`)
}

console.log("DevGuardian smoke checks passed")
