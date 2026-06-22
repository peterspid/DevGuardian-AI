import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const wasmDir = path.join(root, "node_modules", "@next", "swc-wasm-nodejs")

if (process.platform === "win32" && existsSync(path.join(wasmDir, "wasm.js"))) {
  process.env.NEXT_TEST_WASM_DIR ||= wasmDir
}

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next")
const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code ?? 0)
  }
})

