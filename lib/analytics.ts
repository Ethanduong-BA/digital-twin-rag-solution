type RagEventStatus = "success" | "error"

export type RagEvent = {
  timestampIso: string
  status: RagEventStatus
  model: string
  queryHash: string
  querySample?: string
  totalMs: number
  vectorMs?: number
  groqMs?: number
  errorMessage?: string
}

type AnalyticsSummary = {
  totals: {
    total: number
    success: number
    failure: number
    successRate: number
  }
  latencyMs: {
    avg: number
    p95: number
  }
  models: Array<{ model: string; count: number }>
  popularQueries: Array<{ queryHash: string; count: number; sample?: string }>
  recent: RagEvent[]
}

const EVENTS_LIST_KEY = "foodrag:events"
const COUNTS_HASH_KEY = "foodrag:counts"
const MODELS_ZSET_KEY = "foodrag:models"
const POPULAR_ZSET_KEY = "foodrag:popular"
const QUERY_SAMPLE_PREFIX = "foodrag:query:sample:"

const MAX_EVENTS_TO_KEEP = 1000
const RECENT_EVENTS_TO_RETURN = 50

function stableHash(input: string): string {
  // Lightweight non-crypto hash for grouping.
  let hash = 5381
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

export function hashQuery(query: string): string {
  return stableHash(query.trim().replace(/\s+/g, " "))
}

function clampString(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input
  return `${input.slice(0, maxChars)}…`
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  // Lazy import to keep edge cases flexible.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis")
  return new Redis({ url, token })
}

type MemoryStore = {
  events: RagEvent[]
  popular: Map<string, { count: number; sample?: string }>
  models: Map<string, number>
  counts: { total: number; success: number; failure: number }
}

function getMemoryStore(): MemoryStore {
  const globalAny = globalThis as unknown as { __foodRagAnalytics?: MemoryStore }
  if (!globalAny.__foodRagAnalytics) {
    globalAny.__foodRagAnalytics = {
      events: [],
      popular: new Map(),
      models: new Map(),
      counts: { total: 0, success: 0, failure: 0 },
    }
  }
  return globalAny.__foodRagAnalytics
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length) - 1))
  return sorted[index] ?? 0
}

export async function trackRagEvent(eventInput: Omit<RagEvent, "timestampIso"> & { timestampIso?: string }) {
  const event: RagEvent = {
    ...eventInput,
    timestampIso: eventInput.timestampIso ?? new Date().toISOString(),
    querySample: eventInput.querySample ? clampString(eventInput.querySample, 200) : undefined,
  }

  const redis = getRedis()
  if (!redis) {
    const store = getMemoryStore()
    store.events.unshift(event)
    store.events = store.events.slice(0, MAX_EVENTS_TO_KEEP)

    store.counts.total += 1
    if (event.status === "success") store.counts.success += 1
    else store.counts.failure += 1

    store.models.set(event.model, (store.models.get(event.model) ?? 0) + 1)
    const popularEntry = store.popular.get(event.queryHash) ?? { count: 0, sample: undefined }
    store.popular.set(event.queryHash, {
      count: popularEntry.count + 1,
      sample: popularEntry.sample ?? event.querySample,
    })

    return
  }

  try {
    await Promise.all([
      redis.lpush(EVENTS_LIST_KEY, JSON.stringify(event)),
      redis.ltrim(EVENTS_LIST_KEY, 0, MAX_EVENTS_TO_KEEP - 1),
      redis.hincrby(COUNTS_HASH_KEY, "total", 1),
      redis.hincrby(COUNTS_HASH_KEY, event.status === "success" ? "success" : "failure", 1),
      redis.zincrby(MODELS_ZSET_KEY, 1, event.model),
      redis.zincrby(POPULAR_ZSET_KEY, 1, event.queryHash),
      event.querySample
        ? redis.set(`${QUERY_SAMPLE_PREFIX}${event.queryHash}`, event.querySample, { nx: true, ex: 60 * 60 * 24 * 30 })
        : Promise.resolve(null),
    ])
  } catch {
    // Best-effort: never fail user requests due to analytics.
  }
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const redis = getRedis()

  if (!redis) {
    const store = getMemoryStore()
    const recent = store.events.slice(0, RECENT_EVENTS_TO_RETURN)
    const latencies = recent.map((e) => e.totalMs).filter((n) => Number.isFinite(n))
    const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0

    const popular = [...store.popular.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([queryHash, data]) => ({ queryHash, count: data.count, sample: data.sample }))

    const models = [...store.models.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([model, count]) => ({ model, count }))

    const totals = store.counts
    const successRate = totals.total ? totals.success / totals.total : 0

    return {
      totals: { ...totals, successRate },
      latencyMs: { avg, p95: percentile(latencies, 95) },
      models,
      popularQueries: popular,
      recent,
    }
  }

  try {
    const [countsRaw, recentRaw, popularRaw, modelsRaw] = await Promise.all([
      redis.hgetall<Record<string, string>>(COUNTS_HASH_KEY),
      redis.lrange<string>(EVENTS_LIST_KEY, 0, RECENT_EVENTS_TO_RETURN - 1),
      redis.zrange(POPULAR_ZSET_KEY, 0, 9, { rev: true, withScores: true } as any),
      redis.zrange(MODELS_ZSET_KEY, 0, 9, { rev: true, withScores: true } as any),
    ])

    const total = Number(countsRaw?.total ?? 0)
    const success = Number(countsRaw?.success ?? 0)
    const failure = Number(countsRaw?.failure ?? 0)
    const successRate = total ? success / total : 0

    const recent: RagEvent[] = (recentRaw ?? [])
      .map((line) => {
        try {
          return JSON.parse(line) as RagEvent
        } catch {
          return null
        }
      })
      .filter((e): e is RagEvent => Boolean(e))

    const latencies = recent.map((e) => e.totalMs).filter((n) => Number.isFinite(n))
    const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0

  const parseZsetPairs = (raw: unknown): Array<{ member: string; score: number }> => {
    if (!raw) return []

    // Common shape: [{ member, score }, ...]
    if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object" && raw[0] !== null) {
      const maybeObj = raw as Array<Record<string, unknown>>
      if ("member" in maybeObj[0] && "score" in maybeObj[0]) {
        return maybeObj
          .map((row) => ({ member: String(row.member ?? ""), score: Number(row.score ?? 0) }))
          .filter((row) => row.member.length > 0)
      }
    }

    // Possible shape: [[member, score], ...]
    if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])) {
      return (raw as Array<[unknown, unknown]>).map(([member, score]) => ({
        member: String(member ?? ""),
        score: Number(score ?? 0),
      }))
    }

    // Fallback shape: [member, score, member, score, ...]
    if (Array.isArray(raw)) {
      const flat = raw as any[]
      const pairs: Array<{ member: string; score: number }> = []
      for (let i = 0; i < flat.length; i += 2) {
        const member = String(flat[i] ?? "")
        const score = Number(flat[i + 1] ?? 0)
        if (member) pairs.push({ member, score: Number.isFinite(score) ? score : 0 })
      }
      return pairs
    }

    return []
  }

    const popularPairs = parseZsetPairs(popularRaw)
    const modelsPairs = parseZsetPairs(modelsRaw)

    const popularQueries = await Promise.all(
      popularPairs.map(async ({ member, score }) => {
        const sample = await redis.get<string>(`${QUERY_SAMPLE_PREFIX}${member}`)
        return { queryHash: member, count: score, sample: sample ?? undefined }
      }),
    )

    const models = modelsPairs.map(({ member, score }) => ({ model: member, count: score }))

    return {
      totals: { total, success, failure, successRate },
      latencyMs: { avg, p95: percentile(latencies, 95) },
      models,
      popularQueries,
      recent,
    }
  } catch {
    // If Redis is misconfigured/unreachable (DNS, auth, networking), don't crash the app.
    const store = getMemoryStore()
    const recent = store.events.slice(0, RECENT_EVENTS_TO_RETURN)
    const latencies = recent.map((e) => e.totalMs).filter((n) => Number.isFinite(n))
    const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0

    const popular = [...store.popular.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([queryHash, data]) => ({ queryHash, count: data.count, sample: data.sample }))

    const models = [...store.models.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([model, count]) => ({ model, count }))

    const totals = store.counts
    const successRate = totals.total ? totals.success / totals.total : 0

    return {
      totals: { ...totals, successRate },
      latencyMs: { avg, p95: percentile(latencies, 95) },
      models,
      popularQueries: popular,
      recent,
    }
  }
}
