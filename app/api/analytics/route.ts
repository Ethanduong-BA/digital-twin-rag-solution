import { NextResponse } from "next/server"

import { getAnalyticsSummary } from "@/lib/analytics"

export async function GET(request: Request) {
  const requiredToken = process.env.ANALYTICS_DASHBOARD_TOKEN
  if (requiredToken) {
    const url = new URL(request.url)
    const tokenFromQuery = url.searchParams.get("token")
    const tokenFromHeader = request.headers.get("x-analytics-token")
    if (tokenFromQuery !== requiredToken && tokenFromHeader !== requiredToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const summary = await getAnalyticsSummary()
  return NextResponse.json(summary)
}
