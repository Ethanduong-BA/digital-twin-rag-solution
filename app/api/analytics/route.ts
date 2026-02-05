import { NextResponse } from "next/server"
import { getInterviewAnalytics, clearInterviewAnalytics } from "@/lib/analytics"

export async function GET() {
  try {
    const analytics = await getInterviewAnalytics()
    return NextResponse.json(analytics)
  } catch (error) {
    console.error("[Analytics API] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    await clearInterviewAnalytics()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Analytics API] Error clearing:", error)
    return NextResponse.json(
      { error: "Failed to clear analytics" },
      { status: 500 }
    )
  }
}
