import { ChatInterface } from "@/components/chat-interface"
import { Apple, Leaf, ChefHat } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-2 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="w-20" />
            <div className="flex items-center gap-2">
              <Apple className="w-8 h-8 text-primary" />
              <Leaf className="w-7 h-7 text-secondary" />
              <ChefHat className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Food RAG
            </h1>
            <a
              href="/analytics"
              className="w-20 text-right text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Analytics
            </a>
          </div>
          <p className="text-center text-muted-foreground mt-2 text-base md:text-lg">
            Discover food insights powered by AI and vector search
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <ChatInterface />
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
