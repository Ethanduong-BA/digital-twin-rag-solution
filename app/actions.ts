"use server"

export interface VectorResult {
  id: string
  score: number
  data?: string
  metadata?: {
    region?: string
    type?: string
    [key: string]: any
  }
}

export interface RAGResponse {
  sources: VectorResult[]
  answer: string
}

export type ChatRole = "user" | "assistant"

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface RAGChatRequest {
  question: string
  model?: string
  messages?: ChatMessage[]
}

type UpstashVectorItem = {
  id: string
  score: number
  data?: string
  metadata?: Record<string, unknown>
}

type UpstashQueryResponse = {
  result?: UpstashVectorItem[]
}

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])

// Query more than we display so we can consistently show ~5 sources.
const DEFAULT_TOP_K = 8
const SOURCES_TO_RETURN = 5
const MIN_QUESTION_LENGTH = 1
const MAX_QUESTION_LENGTH = 2_000

const VECTOR_REQUEST_TIMEOUT_MS = 12_000
const GROQ_REQUEST_TIMEOUT_MS = 18_000

// Keep context bounded so we don't waste tokens/time on extremely long documents.
const MAX_DOC_CHARS = 1_400
const MAX_TOTAL_CONTEXT_CHARS = 6_000
const MAX_METADATA_VALUE_CHARS = 300

// In-memory cache helps locally and on warm serverless instances.
// It is best-effort: it may not persist across deployments/cold starts.
const CACHE_TTL_MS = 60_000
const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"
const ALLOWED_GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"] as const
type AllowedGroqModel = (typeof ALLOWED_GROQ_MODELS)[number]
const SYSTEM_PROMPT =
  "You are a helpful food expert assistant. Answer questions about food based on the provided context. Be informative and friendly. If the context doesn't contain relevant information, say so politely."

interface RetryOptions {
  label: string
  retries?: number
  initialDelayMs?: number
  backoffFactor?: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type CacheEntry<T> = { value: T; expiresAtMs: number }

function getCacheStore(): Map<string, CacheEntry<unknown>> {
  const globalAny = globalThis as unknown as { __foodRagCache?: Map<string, CacheEntry<unknown>> }
  if (!globalAny.__foodRagCache) globalAny.__foodRagCache = new Map()
  return globalAny.__foodRagCache
}

function cacheGet<T>(key: string): T | undefined {
  const entry = getCacheStore().get(key)
  if (!entry) return undefined
  if (Date.now() >= entry.expiresAtMs) {
    getCacheStore().delete(key)
    return undefined
  }
  return entry.value as T
}

function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  getCacheStore().set(key, { value, expiresAtMs: Date.now() + ttlMs })
}

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ")
}

function clampString(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input
  return `${input.slice(0, maxChars)}…`
}

function pickAllowedGroqModel(model: string | undefined): AllowedGroqModel {
  if (!model) return DEFAULT_GROQ_MODEL
  const normalized = model === "llama-3.1-70b-versatile" ? "llama-3.3-70b-versatile" : model
  return (ALLOWED_GROQ_MODELS as readonly string[]).includes(normalized)
    ? (normalized as AllowedGroqModel)
    : DEFAULT_GROQ_MODEL
}

function stableHash(input: string): string {
  // Lightweight, non-crypto hash for cache keys.
  let hash = 5381
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

function sanitizeChatMessages(messages: ChatMessage[] | undefined): ChatMessage[] {
  if (!messages || messages.length === 0) return []

  const MAX_MESSAGES = 10
  const MAX_MESSAGE_CHARS = 800

  return messages
    .filter((m): m is ChatMessage =>
      Boolean(
        m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      ),
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: clampString(m.content.trim().replace(/\s+/g, " "), MAX_MESSAGE_CHARS),
    }))
}

async function fetchWithTimeout(
  requestFactory: (signal: AbortSignal) => Promise<Response>,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await requestFactory(controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWithRetry(requestFactory: () => Promise<Response>, options: RetryOptions): Promise<Response> {
  const { label, retries = 3, initialDelayMs = 500, backoffFactor = 2 } = options
  let attempt = 0
  let delayMs = initialDelayMs

  while (attempt < retries) {
    attempt += 1
    try {
      const response = await requestFactory()

      if (!response.ok && RETRYABLE_STATUS_CODES.has(response.status) && attempt < retries) {
        console.warn(
          `[${label}] transient status ${response.status} on attempt ${attempt}. Retrying in ${delayMs}ms...`,
        )
        await sleep(delayMs)
        delayMs *= backoffFactor
        continue
      }

      return response
    } catch (error) {
      if (attempt >= retries) {
        throw error instanceof Error
          ? new Error(`${label} request failed after ${retries} attempts: ${error.message}`)
          : new Error(`${label} request failed after ${retries} attempts.`)
      }

      console.warn(`[${label}] network error on attempt ${attempt}. Retrying in ${delayMs}ms...`)
      await sleep(delayMs)
      delayMs *= backoffFactor
    }
  }

  throw new Error(`${label} request failed after ${retries} attempts.`)
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      "Missing required credentials. Please add UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN, and GROQ_API_KEY to your environment variables.",
    )
  }
  return value
}

function assertVectorUrlLooksValid(vectorUrl: string): void {
  if (vectorUrl.includes("upstash.io") && !vectorUrl.includes("vector")) {
    throw new Error(
      "The UPSTASH_VECTOR_REST_URL appears to be a Redis URL, not a Vector database URL. Please use your Upstash Vector database credentials instead. Vector URLs typically contain 'vector' in the domain.",
    )
  }
}

function pickDocumentText(item: UpstashVectorItem): string {
  const metadata = item.metadata ?? {}

  const metadataAny = metadata as Record<string, unknown>
  const candidates = [
    item.data,
    metadataAny.text,
    metadataAny.description,
    metadataAny.content,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate
  }

  return "No description available"
}

function formatMetadataValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return clampString(value, MAX_METADATA_VALUE_CHARS)
  if (typeof value === "number" || typeof value === "boolean") return String(value)

  // Arrays/objects: stringify but keep it short.
  try {
    return clampString(JSON.stringify(value), MAX_METADATA_VALUE_CHARS)
  } catch {
    return clampString(String(value), MAX_METADATA_VALUE_CHARS)
  }
}

function formatExtraMetadataLines(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return ""

  return Object.entries(metadata)
    .filter(([key]) => !["text", "description", "content"].includes(key))
    .map(([key, value]) => `${key}: ${formatMetadataValue(value)}`)
    .join("\n")
}

function buildContextFromVectorResults(results: UpstashVectorItem[]): string {
  let totalChars = 0
  const parts: string[] = []

  for (let i = 0; i < results.length; i += 1) {
    if (totalChars >= MAX_TOTAL_CONTEXT_CHARS) break

    const item = results[i]
    const text = clampString(pickDocumentText(item), MAX_DOC_CHARS)
    const extra = formatExtraMetadataLines(item.metadata)
    const block = `Document ${i + 1}:\n${text}${extra ? `\n${extra}` : ""}`

    parts.push(block)
    totalChars += block.length
  }

  return parts.join("\n\n")
}

async function queryUpstashVector(question: string): Promise<UpstashVectorItem[]> {
  const cacheKey = `vector:${DEFAULT_TOP_K}:${question}`
  const cached = cacheGet<UpstashVectorItem[]>(cacheKey)
  if (cached) return cached

  const vectorUrl = requireEnv("UPSTASH_VECTOR_REST_URL")
  const vectorToken = requireEnv("UPSTASH_VECTOR_REST_TOKEN")
  requireEnv("GROQ_API_KEY")

  assertVectorUrlLooksValid(vectorUrl)

  const response = await fetchWithRetry(
    () =>
      fetchWithTimeout(
        (signal) =>
          fetch(`${vectorUrl}/query-data`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${vectorToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: question,
              topK: DEFAULT_TOP_K,
              includeMetadata: true,
              includeVectors: false,
            }),
            signal,
          }),
        VECTOR_REQUEST_TIMEOUT_MS,
      ),
    { label: "Upstash Vector", retries: 3, initialDelayMs: 400 },
  )

  if (!response.ok) {
    throw new Error(
      `Vector search failed (${response.status}). Please verify your Upstash Vector credentials are correct.`,
    )
  }

  const json = (await response.json()) as UpstashQueryResponse
  const results = json.result ?? []
  cacheSet(cacheKey, results, CACHE_TTL_MS)
  return results
}

async function queryGroqAnswer(question: string, context: string): Promise<string> {
  const cacheKey = `answer:${DEFAULT_GROQ_MODEL}:${question}:${context.length}`
  const cached = cacheGet<string>(cacheKey)
  if (cached) return cached

  const groqKey = requireEnv("GROQ_API_KEY")

  const response = await fetchWithRetry(
    () =>
      fetchWithTimeout(
        (signal) =>
          fetch(GROQ_CHAT_COMPLETIONS_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: DEFAULT_GROQ_MODEL,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                  role: "user",
                  content: `Context:\n${context}\n\nQuestion: ${question}\n\nPlease provide a helpful answer based on the context above.`,
                },
              ],
              temperature: 0.7,
              max_tokens: 500,
            }),
            signal,
          }),
        GROQ_REQUEST_TIMEOUT_MS,
      ),
    { label: "Groq API", retries: 4, initialDelayMs: 800 },
  )

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${errorData}`)
  }

  const json = (await response.json()) as GroqChatCompletionResponse
  const answer = json.choices?.[0]?.message?.content?.trim() || "No response generated."
  cacheSet(cacheKey, answer, CACHE_TTL_MS)
  return answer
}

async function queryGroqChatAnswer(params: {
  model: AllowedGroqModel
  question: string
  context: string
  messages: ChatMessage[]
}): Promise<string> {
  const { model, question, context, messages } = params
  const historyFingerprint = stableHash(
    messages.map((m) => `${m.role}:${m.content.slice(0, 120)}`).join("\n"),
  )

  const cacheKey = `chat:${model}:${question}:${context.length}:${historyFingerprint}`
  const cached = cacheGet<string>(cacheKey)
  if (cached) return cached

  const groqKey = requireEnv("GROQ_API_KEY")

  const response = await fetchWithRetry(
    () =>
      fetchWithTimeout(
        (signal) =>
          fetch(GROQ_CHAT_COMPLETIONS_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                  role: "system",
                  content: `Context:\n${context}\n\nUse the context above when it is relevant. If the context doesn't contain relevant information, say so politely.`,
                },
                ...messages,
                {
                  role: "user",
                  content: question,
                },
              ],
              temperature: 0.7,
              max_tokens: 500,
            }),
            signal,
          }),
        GROQ_REQUEST_TIMEOUT_MS,
      ),
    { label: "Groq API", retries: 4, initialDelayMs: 800 },
  )

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${errorData}`)
  }

  const json = (await response.json()) as GroqChatCompletionResponse
  const answer = json.choices?.[0]?.message?.content?.trim() || "No response generated."
  cacheSet(cacheKey, answer, CACHE_TTL_MS)
  return answer
}

export async function ragQuery(question: string): Promise<RAGResponse> {
  try {
    const normalizedQuestion = normalizeQuestion(question)
    if (normalizedQuestion.length < MIN_QUESTION_LENGTH) {
      throw new Error("Please enter a question.")
    }
    if (normalizedQuestion.length > MAX_QUESTION_LENGTH) {
      throw new Error("Your question is too long. Please shorten it and try again.")
    }

    const vectorResults = await queryUpstashVector(normalizedQuestion)
    const selectedResults = vectorResults.slice(0, SOURCES_TO_RETURN)

    if (selectedResults.length === 0) {
      return {
        sources: [],
        answer: "I couldn't find relevant entries in the food knowledge base for that query. Please try rephrasing or expanding the description.",
      }
    }

    const context = buildContextFromVectorResults(selectedResults)
    const answer = await queryGroqAnswer(normalizedQuestion, context)

    return {
      sources: selectedResults.map((r: any) => ({
        id: r.id,
        score: r.score,
        data: r.data,
        metadata: r.metadata,
      })),
      answer,
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to process your question. Please try again.")
  }
}

export async function ragChat(request: RAGChatRequest): Promise<RAGResponse> {
  try {
    const normalizedQuestion = normalizeQuestion(request.question)
    if (normalizedQuestion.length < MIN_QUESTION_LENGTH) {
      throw new Error("Please enter a question.")
    }
    if (normalizedQuestion.length > MAX_QUESTION_LENGTH) {
      throw new Error("Your question is too long. Please shorten it and try again.")
    }

    const model = pickAllowedGroqModel(request.model)
    const sanitizedMessages = sanitizeChatMessages(request.messages)

    const vectorResults = await queryUpstashVector(normalizedQuestion)
    const selectedResults = vectorResults.slice(0, SOURCES_TO_RETURN)

    if (selectedResults.length === 0) {
      return {
        sources: [],
        answer:
          "I couldn't find relevant entries in the food knowledge base for that query. Please try rephrasing or expanding the description.",
      }
    }

    const context = buildContextFromVectorResults(selectedResults)
    const answer = await queryGroqChatAnswer({
      model,
      question: normalizedQuestion,
      context,
      messages: sanitizedMessages,
    })

    return {
      sources: selectedResults.map((r: any) => ({
        id: r.id,
        score: r.score,
        data: r.data,
        metadata: r.metadata,
      })),
      answer,
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to process your question. Please try again.")
  }
}
