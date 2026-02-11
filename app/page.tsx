import { InterviewChat } from "@/components/interview-chat"
import { BarChart3 } from "lucide-react"
import Link from "next/link"

const ownerName = process.env.OWNER_NAME || "Digital Twin"
const ownerFirstName = process.env.OWNER_FIRST_NAME || ownerName.split(" ")[0]

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Minimal Header */}
      <header className="shrink-0 py-4 border-b">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="w-20" />
          <h1 className="text-xl font-semibold text-foreground">
            {ownerName}&apos;s Digital Twin
          </h1>
          <Link
            href="/analytics"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <InterviewChat ownerName={ownerName} ownerFirstName={ownerFirstName} />
      </main>
    </div>
  )
}
