import "server-only"

import { MongoClient, type Collection } from "mongodb"
import { seedAuditRecords, type AuditRecord } from "@/lib/devguardian-data"

const globalForAudit = globalThis as typeof globalThis & {
  __devguardianAudit?: AuditRecord[]
  __devguardianMongo?: Promise<MongoClient>
}

function memoryAudit() {
  if (!globalForAudit.__devguardianAudit) {
    globalForAudit.__devguardianAudit = [...seedAuditRecords]
  }
  return globalForAudit.__devguardianAudit
}

export class AuditStoreUnavailableError extends Error {
  status = 503
  code = "audit_store_unavailable"

  constructor(message: string) {
    super(message)
    this.name = "AuditStoreUnavailableError"
  }
}

function allowMemoryAudit() {
  return process.env.DEVGUARDIAN_ALLOW_MEMORY_AUDIT === "true" || process.env.NODE_ENV !== "production"
}

async function getCollection(): Promise<Collection<AuditRecord> | null> {
  if (!process.env.MONGODB_URI) {
    if (allowMemoryAudit()) return null
    throw new AuditStoreUnavailableError("MONGODB_URI is required for production audit persistence.")
  }

  try {
    globalForAudit.__devguardianMongo =
      globalForAudit.__devguardianMongo || MongoClient.connect(process.env.MONGODB_URI)
    const client = await globalForAudit.__devguardianMongo
    return client.db(process.env.MONGODB_DB || "devguardian_ai").collection<AuditRecord>("audit_events")
  } catch {
    globalForAudit.__devguardianMongo = undefined
    if (allowMemoryAudit()) return null
    throw new AuditStoreUnavailableError("MongoDB audit store is unavailable.")
  }
}

export async function listAuditRecords(limit = 50) {
  const collection = await getCollection()
  if (!collection) {
    return memoryAudit()
      .slice()
      .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
      .slice(0, limit)
  }

  const existingCount = await collection.countDocuments()
  if (existingCount === 0 && process.env.NODE_ENV !== "production") {
    await collection.insertMany(seedAuditRecords)
  }

  return collection.find({}, { projection: { _id: 0 } }).sort({ ts: -1 }).limit(limit).toArray()
}

export async function appendAuditRecord(record: AuditRecord) {
  const collection = await getCollection()
  if (!collection) {
    memoryAudit().unshift(record)
    return record
  }
  await collection.insertOne(record)
  return record
}
