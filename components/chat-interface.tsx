"use client"

import type React from "react"

import { useState } from "react"
import { Send, Loader2, Sparkles, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ragQuery, type RAGResponse } from "@/app/actions"

export function ChatInterface() {
  const [question, setQuestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<RAGResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const result = await ragQuery(question.trim())
      setResponse(result)
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Question Input */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Ask About Food
          </CardTitle>
          <CardDescription>Ask any question about fruits, spices, and food items in our database</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="E.g., What yellow fruits are available? Tell me about spicy foods..."
              className="min-h-[100px] resize-none text-base"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !question.trim()}
              size="icon"
              className="h-[100px] w-12 shrink-0"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-2 shadow-lg animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3 text-muted-foreground py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg">Searching and generating response...</span>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Results */}
      {response && !isLoading && (
        <div className="space-y-6">
          {/* Sources Section */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Database className="w-5 h-5 text-primary" />
                Sources ({response.sources.length})
              </CardTitle>
              <CardDescription>Retrieved documents from vector database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {response.sources.map((source, index) => {
                const textContent = getSourceText(source)

                return (
                  <div
                    key={source.id || index}
                    className="p-4 rounded-lg bg-card border-2 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p className="font-semibold text-sm text-muted-foreground">Document {index + 1}</p>
                      <Badge variant="secondary" className="shrink-0">
                        {(source.score * 100).toFixed(1)}% match
                      </Badge>
                    </div>
                    <p className="text-base mb-3 leading-relaxed">{textContent}</p>
                    {source.metadata && Object.keys(source.metadata).length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(source.metadata)
                          .filter(([key]) => !["text", "description", "content"].includes(key))
                          .map(([key, value]) => (
                            <Badge key={key} variant="outline" className="bg-primary/10">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* AI Response Section */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Response
              </CardTitle>
              <CardDescription>Generated answer from Groq LLM</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="text-base leading-relaxed whitespace-pre-wrap">{response.answer}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
