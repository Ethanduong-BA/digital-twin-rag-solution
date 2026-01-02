"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Send, Loader2, Sparkles, Database, Copy, Share2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ragChat, type ChatMessage, type RAGResponse, type VectorResult } from "@/app/actions"

type AllowedModel = "llama-3.1-8b-instant" | "llama-3.3-70b-versatile"

type ChatMessageView = {
  id: string
  role: ChatMessage["role"]
  content: string
  sources?: VectorResult[]
}

const EXAMPLE_QUERIES: Array<{ label: string; prompt: string }> = [
  { label: "Spicy", prompt: "Recommend spicy vegetarian dishes that are ready in under an hour." },
  { label: "Summer", prompt: "What are refreshing foods to eat in summer with herbs and citrus?" },
  { label: "High-protein", prompt: "Suggest high-protein, low-carb meal prep ideas from the dataset." },
  { label: "Seafood", prompt: "Give me pescatarian bowls with grilled elements and bright flavors." },
  { label: "Dessert", prompt: "Which desserts have caramelized or burnt sugar notes?" },
]

const CATEGORY_SUGGESTIONS: Array<{ title: string; items: Array<{ label: string; prompt: string }> }> = [
  {
    title: "Quick picks",
    items: [
      { label: "Street food", prompt: "Street food dishes with smoky or charred flavors." },
      { label: "Comfort", prompt: "Comfort foods featuring long-simmered stews." },
      { label: "Fermented", prompt: "Fermented dishes with tangy profiles." },
    ],
  },
  {
    title: "Dietary",
    items: [
      { label: "Vegan", prompt: "Anti-inflammatory vegan dishes that use turmeric or ginger." },
      { label: "Mediterranean", prompt: "Healthy Mediterranean options with grains and herbs." },
      { label: "Low-carb", prompt: "High-protein low-carb foods suitable for meal prep." },
    ],
  },
  {
    title: "Cooking method",
    items: [
      { label: "Cast-iron", prompt: "Recipes relying on cast-iron cooking or skillets." },
      { label: "Grilled", prompt: "Dishes that can be grilled outdoors with diners involved." },
    ],
  },
]

function createMessageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function toServerMessages(messages: ChatMessageView[]): ChatMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }))
}

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  // Fallback for older browsers.
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  textarea.remove()
}

function findPreviousUserMessage(messages: ChatMessageView[], assistantIndex: number): string {
  for (let i = assistantIndex - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return messages[i].content
  }
  return ""
}

export function ChatInterface() {
  const [question, setQuestion] = useState("")
  const [model, setModel] = useState<AllowedModel>("llama-3.1-8b-instant")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const canSend = Boolean(question.trim()) && !isLoading

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, isLoading])

  const turns = useMemo(() => Math.floor(messages.length / 2), [messages.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || isLoading) return

    setIsLoading(true)
    setError(null)

    const priorMessages = messages
    const userMessage: ChatMessageView = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
    }
    setMessages([...priorMessages, userMessage])
    setQuestion("")

    try {
      const result: RAGResponse = await ragChat({
        question: trimmed,
        model,
        messages: toServerMessages(priorMessages),
      })

      const assistantMessage: ChatMessageView = {
        id: createMessageId(),
        role: "assistant",
        content: result.answer,
        sources: result.sources,
      }
      setMessages((current) => [...current, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const getSourceText = (source: RAGResponse["sources"][0]) => {
    const textContent = source.data || source.metadata?.text || source.metadata?.description || source.metadata?.content

    if (textContent) return textContent

    // If no text, create a summary from metadata
    if (source.metadata && Object.keys(source.metadata).length > 0) {
      const metadataPairs = Object.entries(source.metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
      return `[Metadata only: ${metadataPairs}]`
    }

    return `[Document ID: ${source.id}]`
  }

  const handleReset = () => {
    if (isLoading) return
    setError(null)
    setQuestion("")
    setMessages([])
  }

  const handleSuggestionClick = (prompt: string) => {
    if (isLoading) return
    setError(null)
    setQuestion(prompt)
    queueMicrotask(() => inputRef.current?.focus())
  }

  const markCopied = (messageId: string) => {
    setCopiedMessageId(messageId)
    window.setTimeout(() => {
      setCopiedMessageId((current) => (current === messageId ? null : current))
    }, 1500)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Chat */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Food Chat
          </CardTitle>
          <CardDescription>Ask questions and follow up — sources are attached to each answer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Example Queries */}
          <div className="rounded-lg border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold">Example queries</p>
              <p className="text-xs text-muted-foreground">Click to fill</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={isLoading}
                  onClick={() => handleSuggestionClick(item.prompt)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Category Suggestions */}
          <div className="rounded-lg border bg-muted/10 p-4">
            <p className="text-sm font-semibold mb-3">Suggestions by category</p>
            <div className="space-y-3">
              {CATEGORY_SUGGESTIONS.map((group) => (
                <div key={group.title} className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="mr-1">
                    {group.title}
                  </Badge>
                  {group.items.map((item) => (
                    <Button
                      key={item.label}
                      type="button"
                      variant="secondary"
                      className="rounded-full"
                      disabled={isLoading}
                      onClick={() => handleSuggestionClick(item.prompt)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Model</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as AllowedModel)}
                disabled={isLoading}
                className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Select model"
              >
                <option value="llama-3.1-8b-instant">LLaMA 3.1 8B (Instant)</option>
                <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B (Versatile)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Turns: {turns}</Badge>
              <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading}>
                New chat
              </Button>
            </div>
          </div>

          <div className="h-[460px] overflow-y-auto rounded-lg border bg-muted/10 p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Start with an example query above, or type your own question.
              </div>
            ) : (
              messages.map((message, index) => {
                const isAssistant = message.role === "assistant"
                const previousUserQuestion = isAssistant ? findPreviousUserMessage(messages, index) : ""

                const canShare =
                  isAssistant &&
                  typeof navigator !== "undefined" &&
                  typeof (navigator as unknown as { share?: unknown }).share === "function"
                return (
                  <div key={message.id} className={isAssistant ? "flex justify-start" : "flex justify-end"}>
                    <div
                      className={
                        isAssistant
                          ? "w-full max-w-[86%] rounded-2xl border bg-card px-4 py-3 shadow-sm"
                          : "w-full max-w-[86%] rounded-2xl bg-primary text-primary-foreground px-4 py-3 shadow-sm"
                      }
                    >
                      {isAssistant && (
                        <div className="flex items-center justify-end gap-2 mb-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full"
                            onClick={async () => {
                              await copyText(message.content)
                              markCopied(message.id)
                            }}
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <Check className="w-4 h-4 mr-2" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-2" /> Copy answer
                              </>
                            )}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 rounded-full"
                            onClick={async () => {
                              const qa = `Q: ${previousUserQuestion || "(question unavailable)"}\n\nA: ${message.content}`
                              await copyText(qa)
                              markCopied(message.id)
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" /> Copy Q&A
                          </Button>

                          {canShare && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-8 rounded-full"
                              onClick={async () => {
                                const text = `Q: ${previousUserQuestion || "(question unavailable)"}\n\nA: ${message.content}`
                                await (navigator as any).share({
                                  title: "Food RAG Answer",
                                  text,
                                })
                              }}
                            >
                              <Share2 className="w-4 h-4 mr-2" /> Share
                            </Button>
                          )}
                        </div>
                      )}

                      <p className={isAssistant ? "text-base leading-relaxed whitespace-pre-wrap" : "text-base whitespace-pre-wrap"}>
                        {message.content}
                      </p>

                      {isAssistant && message.sources && message.sources.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer select-none text-sm text-muted-foreground hover:text-foreground">
                            Sources ({message.sources.length})
                          </summary>
                          <div className="mt-3 space-y-2">
                            {message.sources.map((source, index) => {
                              const textContent = getSourceText(source)
                              return (
                                <div key={`${message.id}:${source.id || index}`} className="rounded-lg border bg-muted/20 p-3">
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <p className="font-semibold text-xs text-muted-foreground">Document {index + 1}</p>
                                    <Badge variant="secondary" className="shrink-0">
                                      {(source.score * 100).toFixed(1)}%
                                    </Badge>
                                  </div>
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{textContent}</p>
                                </div>
                              )
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="w-full max-w-[86%] rounded-2xl border bg-card px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking…</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              className="min-h-[64px] resize-none text-base"
              disabled={isLoading}
            />
            <Button type="submit" disabled={!canSend} size="icon" className="h-[64px] w-12 shrink-0 rounded-xl">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-2 border-destructive shadow-lg">
          <CardContent className="pt-6">
            <div className="text-destructive text-center py-4">
              <p className="font-semibold text-lg mb-2">Error</p>
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
