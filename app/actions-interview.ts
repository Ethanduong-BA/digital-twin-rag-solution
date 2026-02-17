"use server"

import { searchProfile, type ProfileVectorResult } from "@/lib/profile-search"
import { trackInterviewEvent } from "@/lib/analytics"
import { hashQuery } from "@/lib/utils"

export interface InterviewResponse {
  sources: ProfileVectorResult[]
  answer: string
}

export type ChatRole = "user" | "assistant"

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface InterviewChatRequest {
  question: string
  model?: string
  messages?: ChatMessage[]
}

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])

const DEFAULT_TOP_K = 8
const SOURCES_TO_RETURN = 5
const MIN_QUESTION_LENGTH = 1
const MAX_QUESTION_LENGTH = 2_000

const VECTOR_REQUEST_TIMEOUT_MS = 12_000
const GROQ_REQUEST_TIMEOUT_MS = 18_000

const MAX_DOC_CHARS = 1_400
const MAX_TOTAL_CONTEXT_CHARS = 6_000

const CACHE_TTL_MS = 60_000
const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"
const ALLOWED_GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"] as const
type AllowedGroqModel = (typeof ALLOWED_GROQ_MODELS)[number]

// Get owner name from environment
const OWNER_NAME = process.env.OWNER_NAME || "Digital Twin"

// Interview-specific system prompt for Digital Twin persona
const INTERVIEW_SYSTEM_PROMPT = `You are ${OWNER_NAME}'s Digital Twin — an AI that represents them authentically in professional job interviews.

## Your Identity
- You speak in first person ("I am...", "My experience in...", "I have worked on...")
- You are warm, professional, and confident
- You answer based ONLY on the provided context from the professional profile
- You represent ${OWNER_NAME} accurately and authentically

## Guidelines
1. If the context contains relevant information, answer naturally as if you ARE Khoa Duong
2. Quantify achievements when possible using specific data from the context
3. Reference specific projects, companies, and technologies mentioned in the context
4. If asked something not in the context, politely redirect: "That's not something I typically discuss in interviews, but I'd be happy to share more about my experience in..."
5. NEVER fabricate experiences, skills, certifications, or achievements not in the context
6. Keep answers conversational but professional
7. When discussing technical skills, be specific about proficiency levels mentioned

## Response Style
- Use "I" and "my" when referring to experiences and skills
- Be concise but thorough
- Include relevant metrics and achievements when available
- Maintain a positive, enthusiastic tone about career opportunities`

interface RetryOptions {
  label: string
  retries?: number
  initialDelayMs?: number
  backoffFactor?: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type CacheEntry<T> = { value: T; expiresAtMs: number }

function getCacheStore(): Map<string, CacheEntry<unknown>> {
  const globalAny = globalThis as unknown as { __interviewRagCache?: Map<string, CacheEntry<unknown>> }
  if (!globalAny.__interviewRagCache) globalAny.__interviewRagCache = new Map()
  return globalAny.__interviewRagCache
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

function buildContextFromProfileResults(results: ProfileVectorResult[]): string {
  let totalChars = 0
  const parts: string[] = []

  for (let i = 0; i < results.length; i += 1) {
    if (totalChars >= MAX_TOTAL_CONTEXT_CHARS) break

    const item = results[i]
    const text = clampString(item.data ?? "No content", MAX_DOC_CHARS)
    const type = item.metadata?.type ?? "info"
    const block = `[${type.toUpperCase()}]\n${text}`

    parts.push(block)
    totalChars += block.length
  }

  return parts.join("\n\n---\n\n")
}

async function queryGroqInterviewAnswer(params: {
  model: AllowedGroqModel
  question: string
  context: string
  messages: ChatMessage[]
}): Promise<string> {
  const { model, question, context, messages } = params
  const historyFingerprint = stableHash(
    messages.map((m) => `${m.role}:${m.content.slice(0, 120)}`).join("\n"),
  )

  const cacheKey = `interview:${model}:${question}:${context.length}:${historyFingerprint}`
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
                { role: "system", content: INTERVIEW_SYSTEM_PROMPT },
                {
                  role: "system",
                  content: `## Profile Context (use this to answer as Khoa Duong)\n\n${context}`,
                },
                ...messages,
                {
                  role: "user",
                  content: question,
                },
              ],
              temperature: 0.7,
              max_tokens: 600,
            }),
            signal,
          }),
        GROQ_REQUEST_TIMEOUT_MS,
      ),
    { label: "Groq API (Interview)", retries: 4, initialDelayMs: 800 },
  )

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${errorData}`)
  }

  const json = (await response.json()) as GroqChatCompletionResponse
  const answer = json.choices?.[0]?.message?.content?.trim() || "I'm not sure how to answer that. Could you rephrase the question?"
  cacheSet(cacheKey, answer, CACHE_TTL_MS)
  return answer
}

/**
 * Interview RAG query - answers interview questions as the Digital Twin persona
 */
export async function interviewQuery(question: string): Promise<InterviewResponse> {
  const startMs = Date.now()
  let vectorMs = 0
  let groqMs = 0
  
  try {
    const normalizedQuestion = normalizeQuestion(question)
    if (normalizedQuestion.length < MIN_QUESTION_LENGTH) {
      throw new Error("Please enter a question.")
    }
    if (normalizedQuestion.length > MAX_QUESTION_LENGTH) {
      throw new Error("Your question is too long. Please shorten it and try again.")
    }

    // Search profile for relevant context
    const vectorStart = Date.now()
    const vectorResults = await searchProfile({ query: normalizedQuestion, topK: DEFAULT_TOP_K })
    vectorMs = Date.now() - vectorStart
    const selectedResults = vectorResults.slice(0, SOURCES_TO_RETURN)

    if (selectedResults.length === 0) {
      trackInterviewEvent({
        status: "success",
        model: DEFAULT_GROQ_MODEL,
        queryHash: hashQuery(normalizedQuestion),
        querySample: normalizedQuestion.slice(0, 60),
        totalMs: Date.now() - startMs,
        vectorMs,
        groqMs: 0,
        sourceTypes: [],
      })
      return {
        sources: [],
        answer: "I don't have specific information about that in my profile. Could you ask about my experience, skills, projects, or education?",
      }
    }

    const context = buildContextFromProfileResults(selectedResults)
    const groqStart = Date.now()
    const answer = await queryGroqInterviewAnswer({
      model: DEFAULT_GROQ_MODEL,
      question: normalizedQuestion,
      context,
      messages: [],
    })
    groqMs = Date.now() - groqStart

    // Track successful event
    const sourceTypes = [...new Set(selectedResults.map(r => r.metadata?.type ?? "unknown"))]
    trackInterviewEvent({
      status: "success",
      model: DEFAULT_GROQ_MODEL,
      queryHash: hashQuery(normalizedQuestion),
      querySample: normalizedQuestion.slice(0, 60),
      totalMs: Date.now() - startMs,
      vectorMs,
      groqMs,
      sourceTypes,
    })

    return {
      sources: selectedResults,
      answer,
    }
  } catch (error) {
    trackInterviewEvent({
      status: "error",
      model: DEFAULT_GROQ_MODEL,
      queryHash: hashQuery(question),
      querySample: question.slice(0, 60),
      totalMs: Date.now() - startMs,
      vectorMs,
      groqMs,
      sourceTypes: [],
    })
    throw new Error(error instanceof Error ? error.message : "Failed to process your question. Please try again.")
  }
}

/**
 * Interview chat with conversation history support
 */
export async function interviewChat(request: InterviewChatRequest): Promise<InterviewResponse> {
  const startMs = Date.now()
  let vectorMs = 0
  let groqMs = 0
  let model: AllowedGroqModel = DEFAULT_GROQ_MODEL
  
  try {
    const normalizedQuestion = normalizeQuestion(request.question)
    if (normalizedQuestion.length < MIN_QUESTION_LENGTH) {
      throw new Error("Please enter a question.")
    }
    if (normalizedQuestion.length > MAX_QUESTION_LENGTH) {
      throw new Error("Your question is too long. Please shorten it and try again.")
    }

    model = pickAllowedGroqModel(request.model)
    const sanitizedMessages = sanitizeChatMessages(request.messages)

    // Search profile for relevant context
    const vectorStart = Date.now()
    const vectorResults = await searchProfile({ query: normalizedQuestion, topK: DEFAULT_TOP_K })
    vectorMs = Date.now() - vectorStart
    const selectedResults = vectorResults.slice(0, SOURCES_TO_RETURN)

    if (selectedResults.length === 0) {
      trackInterviewEvent({
        status: "success",
        model,
        queryHash: hashQuery(normalizedQuestion),
        querySample: normalizedQuestion.slice(0, 60),
        totalMs: Date.now() - startMs,
        vectorMs,
        groqMs: 0,
        sourceTypes: [],
      })
      return {
        sources: [],
        answer: "I don't have specific information about that in my profile. Could you ask about my experience, skills, projects, or education?",
      }
    }

    const context = buildContextFromProfileResults(selectedResults)
    const groqStart = Date.now()
    const answer = await queryGroqInterviewAnswer({
      model,
      question: normalizedQuestion,
      context,
      messages: sanitizedMessages,
    })
    groqMs = Date.now() - groqStart

    // Track successful event
    const sourceTypes = [...new Set(selectedResults.map(r => r.metadata?.type ?? "unknown"))]
    trackInterviewEvent({
      status: "success",
      model,
      queryHash: hashQuery(normalizedQuestion),
      querySample: normalizedQuestion.slice(0, 60),
      totalMs: Date.now() - startMs,
      vectorMs,
      groqMs,
      sourceTypes,
    })

    return {
      sources: selectedResults,
      answer,
    }
  } catch (error) {
    trackInterviewEvent({
      status: "error",
      model,
      queryHash: hashQuery(request.question),
      querySample: request.question.slice(0, 60),
      totalMs: Date.now() - startMs,
      vectorMs,
      groqMs,
      sourceTypes: [],
    })
    throw new Error(error instanceof Error ? error.message : "Failed to process your question. Please try again.")
  }
}
