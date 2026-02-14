import { InterviewChat } from "@/components/interview-chat"
import { BarChart3, Sparkles, LayoutGrid, Star } from "lucide-react"
import Link from "next/link"

const ownerName = process.env.OWNER_NAME || "Professional Profile"
const ownerFirstName = process.env.OWNER_FIRST_NAME || "Agent"

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-white text-[#1f1f1f] selection:bg-blue-100">
      
      <header className="h-[64px] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <LayoutGrid className="w-5 h-5 text-gray-500" />
          </div>

          <div className="flex items-center gap-2 px-2">
            {/* 🔹 Updated Middle Icon */}
            <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md shadow-sm">
              <Star className="w-4 h-4 text-white" />
            </div>

            <span className="text-[20px] font-normal tracking-tight text-[#444746]">
              Digital Twin <span className="text-blue-600 font-semibold">AI</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 border border-blue-100 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[12px] font-semibold text-blue-700 uppercase tracking-tighter">
              Llama 3.1 Pro
            </span>
          </div>
          
          <Link
            href="/analytics"
            className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-all"
            title="Performance Metrics"
          >
            <BarChart3 className="w-5 h-5" />
          </Link>
          
          {/* 🔹 Right Avatar Star */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ml-2">
            <Star className="w-4 h-4 text-white" />
          </div>

        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col h-full px-4 sm:px-0">
          <InterviewChat 
            ownerName={ownerName} 
            ownerFirstName={ownerFirstName} 
          />
        </div>
      </main>

      <footer className="py-4 text-center shrink-0">
        <p className="text-[11px] text-[#70757a] font-light">
          Digital Twin AI may display inaccurate info, so double-check its responses. 
          <span className="ml-1 underline cursor-pointer">Privacy Hub</span>
        </p>
      </footer>
    </div>
  )
}
