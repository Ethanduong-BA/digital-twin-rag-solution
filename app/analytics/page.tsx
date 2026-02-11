"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Database,
  Zap,
  Pause,
  Play,
} from "lucide-react"

interface InterviewEvent {
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

interface AnalyticsSummary {
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

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchAnalytics = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/analytics")
      if (!response.ok) throw new Error("Failed to fetch analytics")
      const data = await response.json()
      setAnalytics(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const clearAnalytics = async () => {
    if (!confirm("Are you sure you want to clear all analytics data?")) return
    try {
      await fetch("/api/analytics", { method: "DELETE" })
      await fetchAnalytics(true)
    } catch (err) {
      setError("Failed to clear analytics")
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchAnalytics(true)
  }, [])

  // Auto-refresh every 3 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchAnalytics(false)
    }, 3000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => fetchAnalytics(true)}>Retry</Button>
      </div>
    )
  }

  if (!analytics) return null

  const maxHourCount = Math.max(...analytics.hourlyDistribution.map((h) => h.count), 1)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Interview
            </Link>
            <h1 className="text-2xl font-bold text-primary">Interview Analytics</h1>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {autoRefresh ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Live
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Paused
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchAnalytics(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={clearAnalytics}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Total Queries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{analytics.totalQueries}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Success Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {analytics.successRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">
                {analytics.successCount} success / {analytics.errorCount} errors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Avg Response Time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatMs(analytics.avgTotalMs)}</p>
              <p className="text-sm text-muted-foreground">
                Vector: {formatMs(analytics.avgVectorMs)} | LLM: {formatMs(analytics.avgGroqMs)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Top Source Type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold capitalize">
                {analytics.topSourceTypes[0]?.type || "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {analytics.topSourceTypes[0]?.count || 0} uses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Profile Sources Used
              </CardTitle>
              <CardDescription>Which profile sections are most referenced</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topSourceTypes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topSourceTypes.map((source) => (
                    <div key={source.type} className="flex items-center gap-3">
                      <Badge variant="outline" className="w-24 justify-center capitalize">
                        {source.type}
                      </Badge>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{
                            width: `${(source.count / analytics.topSourceTypes[0].count) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {source.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hourly Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Query Activity by Hour
              </CardTitle>
              <CardDescription>When interviews happen most</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32">
                {analytics.hourlyDistribution.map((hour) => (
                  <div
                    key={hour.hour}
                    className="flex-1 bg-primary/30 rounded-t hover:bg-primary/50 transition-colors"
                    style={{
                      height: `${Math.max((hour.count / maxHourCount) * 100, 4)}%`,
                    }}
                    title={`${hour.hour}:00 - ${hour.count} queries`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
                <span>11pm</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Popular Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Popular Interview Questions
            </CardTitle>
            <CardDescription>Most frequently asked questions</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.querySamples.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No questions asked yet</p>
            ) : (
              <div className="space-y-2">
                {analytics.querySamples.map((sample, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <p className="text-sm">{sample.query}</p>
                    <Badge variant="secondary">{sample.count}x</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Interview Queries</CardTitle>
            <CardDescription>Last 20 interview interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analytics.recentEvents.map((event, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border"
                  >
                    {event.status === "success" ? (
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {event.querySample || `Query #${event.queryHash}`}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(event.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatMs(event.totalMs)}
                        </span>
                        {event.sourceTypes?.map((type) => (
                          <Badge key={type} variant="outline" className="text-xs capitalize">
                            {type}
                          </Badge>
                        ))}
                      </div>
                      {event.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">{event.errorMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
