import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@terminal3/t3n-sdk"],
  transpilePackages: ["framer-motion", "motion-dom", "motion-utils"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@terminal3/t3n-sdk/dist/wasm/generated/session.core.wasm"],
  },
  turbopack: {
    root: __dirname,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "motion-dom": path.join(__dirname, "node_modules", "motion-dom", "dist", "es", "index.mjs"),
      "motion-utils": path.join(__dirname, "node_modules", "motion-utils", "dist", "es", "index.mjs"),
    }
    return config
  },
}

export default nextConfig
