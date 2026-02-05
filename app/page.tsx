import { InterviewChat } from "@/components/interview-chat"
import { User, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-2 sticky top-0 z-10 backdrop-blur-sm bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {/* Spacer */}
            <div className="w-24" />
            
            {/* Center: Logo + Title */}
            <div className="flex items-center gap-4">
              <User className="w-10 h-10 text-blue-600" />
              <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600">
                Digital Twin
              </h1>
            </div>

            {/* Analytics Link */}
            <Link
              href="/analytics"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Link>
          </div>
          <p className="text-center text-muted-foreground mt-2 text-base md:text-lg">
            Interview Aniraj Khadgi's Digital Twin — powered by RAG
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <InterviewChat />
      </main>

      {/* Footer */}
      <footer className="border-t-2 mt-auto bg-muted/30">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Powered by Upstash Vector, Groq AI, and Next.js</p>
        </div>
      </footer>
    </div>
  )
}
