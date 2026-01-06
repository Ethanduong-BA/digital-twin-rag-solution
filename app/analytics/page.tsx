import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { getAnalyticsSummary } from "@/lib/analytics"

function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return "—"
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.round(ms)}ms`
}

export default async function AnalyticsPage() {
  const summary = await getAnalyticsSummary()

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Basic usage tracking for the Food RAG app.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total usage</CardTitle>
            <CardDescription>Requests processed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">{summary.totals.total}</div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">Success: {summary.totals.success}</Badge>
              <Badge variant="secondary">Failure: {summary.totals.failure}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latency</CardTitle>
            <CardDescription>Based on recent events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">Average</div>
            <div className="text-2xl font-bold">{formatMs(summary.latencyMs.avg)}</div>
            <div className="text-sm text-muted-foreground">p95</div>
            <div className="text-2xl font-bold">{formatMs(summary.latencyMs.p95)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success rate</CardTitle>
            <CardDescription>Recent stability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">{(summary.totals.successRate * 100).toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">Includes both chat + single-turn runs.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Popular queries</CardTitle>
            <CardDescription>Counts by query hash (with a sample prompt)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.popularQueries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              summary.popularQueries.map((q) => (
                <div key={q.queryHash} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{q.sample ?? "(no sample)"}</p>
                    <Badge variant="secondary">{q.count}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">hash: {q.queryHash}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Models</CardTitle>
            <CardDescription>Which models are being used</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.models.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              summary.models.map((m) => (
                <div key={m.model} className="flex items-center justify-between rounded-lg border p-3">
                  <p className="text-sm font-semibold">{m.model}</p>
                  <Badge variant="secondary">{m.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Most recent requests (best-effort)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            summary.recent.map((e) => (
              <div key={`${e.timestampIso}:${e.queryHash}`} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <Badge variant={e.status === "success" ? "secondary" : "destructive"}>{e.status}</Badge>
                <Badge variant="outline">{e.model}</Badge>
                <span className="text-sm text-muted-foreground">{new Date(e.timestampIso).toLocaleString()}</span>
                <span className="text-sm">{formatMs(e.totalMs)}</span>
                <span className="text-xs text-muted-foreground">hash: {e.queryHash}</span>
                {e.errorMessage ? <span className="text-xs text-destructive">{e.errorMessage}</span> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Optional protection: set <span className="font-mono">ANALYTICS_DASHBOARD_TOKEN</span> to require a token for the API.
      </p>
    </div>
  )
}
