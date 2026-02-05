"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Send, Loader2, User, Copy, Share2, Check, Briefcase, GraduationCap, Code, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { interviewChat, type ChatMessage, type InterviewResponse } from "@/app/actions-interview"
import { type ProfileVectorResult } from "@/lib/profile-search"

type AllowedModel = "llama-3.1-8b-instant" | "llama-3.3-70b-versatile"

type ChatMessageView = {
  id: string
  role: ChatMessage["role"]
  content: string
  sources?: ProfileVectorResult[]
}

const INTERVIEW_QUESTIONS: Array<{ label: string; prompt: string; icon: React.ReactNode }> = [
  { label: "Tell me about yourself", prompt: "Tell me about yourself and your professional background.", icon: <User className="w-4 h-4" /> },
  { label: "Technical skills", prompt: "What are your key technical skills and how have you applied them?", icon: <Code className="w-4 h-4" /> },
  { label: "Recent experience", prompt: "Can you walk me through your most recent work experience?", icon: <Briefcase className="w-4 h-4" /> },
  { label: "Education", prompt: "Tell me about your educational background and what you learned.", icon: <GraduationCap className="w-4 h-4" /> },
  { label: "Strengths", prompt: "What would you consider your greatest professional strengths?", icon: <MessageSquare className="w-4 h-4" /> },
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

export function InterviewChat() {
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
      const result: InterviewResponse = await interviewChat({
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

  const getSourceText = (source: ProfileVectorResult) => {
    return source.data || "[No content available]"
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
      <Card className="border-2 shadow-lg border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Digital Twin Interview
          </CardTitle>
          <CardDescription>
            Interview Aniraj Khadgi's Digital Twin — ask questions about experience, skills, and background.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Interview Questions */}
          <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/30 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold">Common Interview Questions</p>
              <p className="text-xs text-muted-foreground">Click to ask</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERVIEW_QUESTIONS.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  variant="outline"
                  className="rounded-full gap-2"
                  disabled={isLoading}
                  onClick={() => handleSuggestionClick(item.prompt)}
                >
                  {item.icon}
                  {item.label}
                </Button>
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
              <Badge variant="secondary">Questions: {turns}</Badge>
              <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading}>
                New Interview
              </Button>
            </div>
          </div>

          <div className="h-[460px] overflow-y-auto rounded-lg border bg-muted/10 p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Welcome! I'm Aniraj's Digital Twin.</p>
                <p>Ask me about my experience, skills, projects, or education. I'll answer based on my professional background.</p>
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
                          ? "w-full max-w-[86%] rounded-2xl border bg-card px-4 py-3 shadow-sm border-blue-200 dark:border-blue-800"
                          : "w-full max-w-[86%] rounded-2xl bg-blue-600 text-white px-4 py-3 shadow-sm"
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
                                <Copy className="w-4 h-4 mr-2" /> Copy
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
                            <Copy className="w-4 h-4 mr-2" /> Q&A
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
                                  title: "Digital Twin Interview",
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
                            Profile Sources ({message.sources.length})
                          </summary>
                          <div className="mt-3 space-y-2">
                            {message.sources.map((source, idx) => {
                              const textContent = getSourceText(source)
                              return (
                                <div key={`${message.id}:${source.id || idx}`} className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/30 p-3">
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {source.metadata?.type || "info"}
                                      </Badge>
                                      {source.metadata?.company && (
                                        <span className="text-xs text-muted-foreground">{source.metadata.company}</span>
                                      )}
                                    </div>
                                    <Badge variant="secondary" className="shrink-0">
                                      {(source.score * 100).toFixed(0)}%
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
                <div className="w-full max-w-[86%] rounded-2xl border bg-card px-4 py-3 shadow-sm border-blue-200 dark:border-blue-800">
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
              placeholder="Ask an interview question…"
              className="min-h-[64px] resize-none text-base"
              disabled={isLoading}
            />
            <Button type="submit" disabled={!canSend} size="icon" className="h-[64px] w-12 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700">
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
