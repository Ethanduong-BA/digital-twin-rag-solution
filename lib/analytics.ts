"use server"

import { Redis } from "@upstash/redis"

/**
 * Interview Analytics Module
 * Tracks interview queries, response times, and source usage for the Digital Twin
 * Persists data to Upstash Redis
 */

const REDIS_KEY = "interview:analytics:events"
const MAX_EVENTS = 1000
const TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function getRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables")
  }

  return new Redis({ url, token })
}

// ---------- Types ----------

export interface InterviewEvent {
  timestamp: string
  status: "success" | "error"
  model: string
  queryHash: string
  querySample?: string
  totalMs: number
  vectorMs?: number
  groqMs?: number
  sourceTypes?: string[]
  errorMessage?: string
}

export interface InterviewAnalyticsSummary {
  totalQueries: number
  successCount: number
  errorCount: number
  successRate: number
  avgTotalMs: number
  avgVectorMs: number
  avgGroqMs: number
  topSourceTypes: Array<{ type: string; count: number }>
  querySamples: Array<{ query: string; count: number }>
  recentEvents: InterviewEvent[]
  hourlyDistribution: Array<{ hour: number; count: number }>
}

// ---------- Track Event ----------

export async function trackInterviewEvent(event: Omit<InterviewEvent, "timestamp">): Promise<void> {
  try {
    const redis = getRedisClient()
    const newEvent: InterviewEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }

    // Push to list and trim to max events
    await redis.lpush(REDIS_KEY, JSON.stringify(newEvent))
    await redis.ltrim(REDIS_KEY, 0, MAX_EVENTS - 1)
    await redis.expire(REDIS_KEY, TTL_SECONDS)
  } catch (error) {
    console.error("[Analytics] Failed to track event:", error)
  }
}

// ---------- Get Events from Redis ----------

async function getEventList(): Promise<InterviewEvent[]> {
  try {
    const redis = getRedisClient()
    const rawEvents = await redis.lrange(REDIS_KEY, 0, -1)
    
    return rawEvents.map((raw) => {
      if (typeof raw === "string") {
        return JSON.parse(raw) as InterviewEvent
      }
      return raw as InterviewEvent
    })
  } catch (error) {
    console.error("[Analytics] Failed to get events:", error)
    return []
  }
}

// ---------- Get Summary ----------

export async function getInterviewAnalytics(): Promise<InterviewAnalyticsSummary> {
  const events = await getEventList()
  
  if (events.length === 0) {
    return {
      totalQueries: 0,
      successCount: 0,
      errorCount: 0,
      successRate: 0,
      avgTotalMs: 0,
      avgVectorMs: 0,
      avgGroqMs: 0,
      topSourceTypes: [],
      querySamples: [],
      recentEvents: [],
      hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
    }
  }

  const successEvents = events.filter((e) => e.status === "success")
  const errorEvents = events.filter((e) => e.status === "error")

  // Calculate averages
  const avgTotalMs = successEvents.length > 0
    ? successEvents.reduce((sum, e) => sum + e.totalMs, 0) / successEvents.length
    : 0
  
  const vectorMsEvents = successEvents.filter((e) => e.vectorMs !== undefined)
  const avgVectorMs = vectorMsEvents.length > 0
    ? vectorMsEvents.reduce((sum, e) => sum + (e.vectorMs ?? 0), 0) / vectorMsEvents.length
    : 0

  const groqMsEvents = successEvents.filter((e) => e.groqMs !== undefined)
  const avgGroqMs = groqMsEvents.length > 0
    ? groqMsEvents.reduce((sum, e) => sum + (e.groqMs ?? 0), 0) / groqMsEvents.length
    : 0

  // Top source types
  const sourceTypeCounts = new Map<string, number>()
  for (const event of successEvents) {
    for (const type of event.sourceTypes ?? []) {
      sourceTypeCounts.set(type, (sourceTypeCounts.get(type) ?? 0) + 1)
    }
  }
  const topSourceTypes = Array.from(sourceTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Query samples (deduplicated by hash)
  const queryHashCounts = new Map<string, { query: string; count: number }>()
  for (const event of events) {
    if (event.querySample) {
      const existing = queryHashCounts.get(event.queryHash)
      if (existing) {
        existing.count += 1
      } else {
        queryHashCounts.set(event.queryHash, { query: event.querySample, count: 1 })
      }
    }
  }
  const querySamples = Array.from(queryHashCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Hourly distribution
  const hourCounts = new Map<number, number>()
  for (const event of events) {
    const hour = new Date(event.timestamp).getHours()
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
  }
  const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: hourCounts.get(i) ?? 0,
  }))

  return {
    totalQueries: events.length,
    successCount: successEvents.length,
    errorCount: errorEvents.length,
    successRate: events.length > 0 ? (successEvents.length / events.length) * 100 : 0,
    avgTotalMs,
    avgVectorMs,
    avgGroqMs,
    topSourceTypes,
    querySamples,
    recentEvents: events.slice(0, 20), // Already in reverse order (newest first) from lpush
    hourlyDistribution,
  }
}

// ---------- Clear Analytics ----------

export async function clearInterviewAnalytics(): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.del(REDIS_KEY)
  } catch (error) {
    console.error("[Analytics] Failed to clear events:", error)
  }
}
