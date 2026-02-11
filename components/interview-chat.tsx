"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Send, Loader2, User, Briefcase, GraduationCap, Code, MessageSquare, ChevronDown, RotateCcw, Copy, Check, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  { label: "About yourself", prompt: "Tell me about yourself and your professional background.", icon: <User className="w-3.5 h-3.5" /> },
  { label: "Technical skills", prompt: "What are your key technical skills and how have you applied them?", icon: <Code className="w-3.5 h-3.5" /> },
  { label: "Experience", prompt: "Can you walk me through your most recent work experience?", icon: <Briefcase className="w-3.5 h-3.5" /> },
  { label: "Education", prompt: "Tell me about your educational background and what you learned.", icon: <GraduationCap className="w-3.5 h-3.5" /> },
  { label: "Strengths", prompt: "What would you consider your greatest professional strengths?", icon: <MessageSquare className="w-3.5 h-3.5" /> },
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

interface InterviewChatProps {
  ownerName: string
  ownerFirstName: string
}

export function InterviewChat({ ownerName, ownerFirstName }: InterviewChatProps) {
  const [question, setQuestion] = useState("")
  const [model, setModel] = useState<AllowedModel>("llama-3.1-8b-instant")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showExpandButton, setShowExpandButton] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const canSend = Boolean(question.trim()) && !isLoading
  const turns = useMemo(() => Math.floor(messages.length / 2), [messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, isLoading])

  // Auto-resize textarea and check if expand button needed
  useEffect(() => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = "auto"
      const scrollHeight = textarea.scrollHeight
      textarea.style.height = `${Math.min(scrollHeight, isExpanded ? 400 : 120)}px`
      // Show expand button if content exceeds 3 lines (approx 72px)
      setShowExpandButton(scrollHeight > 80)
    }
  }, [question, isExpanded])

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

  const handleCopy = async (messageId: string, text: string) => {
    await copyText(text)
    setCopiedMessageId(messageId)
    window.setTimeout(() => {
      setCopiedMessageId((current) => (current === messageId ? null : current))
    }, 1500)
  }

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-medium text-foreground mb-2">
              Hi, I&apos;m {ownerFirstName}&apos;s Digital Twin
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Ask me about experience, skills, projects, or education. I&apos;ll answer based on my professional background.
            </p>
            
            {/* Quick Questions */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {INTERVIEW_QUESTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSuggestionClick(item.prompt)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-muted/80 text-foreground transition-colors disabled:opacity-50"
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant"
              return (
                <div key={message.id} className={isAssistant ? "" : "flex justify-end"}>
                  {isAssistant ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-medium">{ownerFirstName}</span>
                      </div>
                      <div className="pl-8">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(message.id, message.content)}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedMessageId === message.id ? (
                              <><Check className="w-3 h-3" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy</>
                            )}
                          </button>
                        </div>
                        {message.sources && message.sources.length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                              Sources ({message.sources.length})
                            </summary>
                            <div className="mt-2 space-y-2">
                              {message.sources.map((source, idx) => (
                                <div key={`${message.id}:${source.id || idx}`} className="text-xs p-2 rounded bg-muted/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {source.metadata?.type || "info"}
                                    </Badge>
                                    <span className="text-muted-foreground">{(source.score * 100).toFixed(0)}%</span>
                                  </div>
                                  <p className="text-muted-foreground line-clamp-2">{source.data}</p>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-muted text-foreground">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}
                </div>
              )
            })}

            {isLoading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-medium">{ownerFirstName}</span>
                </div>
                <div className="pl-8 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="pl-8 text-sm text-destructive">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 px-4 pb-4">
        <div className="relative max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="relative rounded-2xl border bg-muted/50 focus-within:ring-2 focus-within:ring-ring">
              {/* Expand button - top right */}
              {(showExpandButton || isExpanded) && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-60 hover:opacity-100"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
              )}
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${ownerFirstName}...`}
                rows={1}
                disabled={isLoading}
                className="w-full resize-none bg-transparent px-4 pt-4 pb-3 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 overflow-y-auto scrollbar-hide"
                style={{
                  minHeight: isExpanded ? "250px" : "24px",
                  maxHeight: isExpanded ? "50vh" : "100px",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none"
                }}
              />
              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
                <div className="flex items-center gap-1">
                  {turns > 0 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-full"
                      onClick={handleReset}
                      disabled={isLoading}
                      title="New interview"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModel(model === "llama-3.1-8b-instant" ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                    title="Click to toggle model"
                  >
                    {model === "llama-3.1-8b-instant" ? "Fast" : "Quality"}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!canSend}
                    className="h-7 w-7 rounded-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </form>

          <p className="text-center text-[10px] text-muted-foreground mt-2">
            Powered by RAG • Responses based on professional profile
          </p>
        </div>
      </div>
    </div>
  )
}
