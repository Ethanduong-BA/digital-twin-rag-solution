import dotenv from "dotenv"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { performance } from "node:perf_hooks"
import process from "node:process"

import { interviewQuery, type InterviewResponse } from "../app/actions-interview"

dotenv.config({
  path: path.resolve(__dirname, "../.env.local"),
  override: false,
})

interface TestQuery {
  id: string
  category: "introduction" | "experience" | "skills" | "behavioral" | "education" | "projects"
  prompt: string
  expectations: string
}

interface TestResult {
  id: string
  category: TestQuery["category"]
  prompt: string
  expectations: string
  status: "success" | "error"
  durationMs: number
  answerPreview?: string
  sourceTypes?: string[]
  errorMessage?: string
}

const INTER_QUERY_DELAY_MS = 4000
const MAX_QUERY_ATTEMPTS = 3

const TEST_QUERIES: TestQuery[] = [
  // Introduction / Summary
  {
    id: "INTRO-01",
    category: "introduction",
    prompt: "Tell me about yourself and your professional background.",
    expectations: "Should mention software development, business analytics, dual expertise, Adelaide location",
  },
  {
    id: "INTRO-02",
    category: "introduction",
    prompt: "What makes you unique as a candidate?",
    expectations: "Should highlight combination of dev skills and analytics background",
  },
  {
    id: "INTRO-03",
    category: "introduction",
    prompt: "Give me your elevator pitch.",
    expectations: "Should provide concise professional summary with key value proposition",
  },

  // Experience
  {
    id: "EXP-01",
    category: "experience",
    prompt: "Tell me about your experience at LIS Nepal.",
    expectations: "Should mention Software Engineer role, B2B SaaS, 50,000+ users, API improvements",
  },
  {
    id: "EXP-02",
    category: "experience",
    prompt: "What achievements are you most proud of in your career?",
    expectations: "Should cite specific metrics: 40% API response improvement, 25% NPS increase",
  },
  {
    id: "EXP-03",
    category: "experience",
    prompt: "Describe a challenging project and how you handled it.",
    expectations: "Should describe technical projects with specific outcomes",
  },

  // Skills
  {
    id: "SKILL-01",
    category: "skills",
    prompt: "What are your primary technical skills?",
    expectations: "Should mention React, Next.js, TypeScript, Python, SQL",
  },
  {
    id: "SKILL-02",
    category: "skills",
    prompt: "Tell me about your experience with data analytics.",
    expectations: "Should mention Tableau, Power BI, SQL, statistical analysis techniques",
  },
  {
    id: "SKILL-03",
    category: "skills",
    prompt: "What tools and methodologies do you use for software development?",
    expectations: "Should mention Agile/Scrum, Git, Docker, CI/CD, TDD",
  },

  // Behavioral
  {
    id: "BEH-01",
    category: "behavioral",
    prompt: "How do you handle working with cross-functional teams?",
    expectations: "Should mention collaboration skills, stakeholder management",
  },
  {
    id: "BEH-02",
    category: "behavioral",
    prompt: "Describe your leadership style.",
    expectations: "Should reference mentoring, team collaboration experiences",
  },
  {
    id: "BEH-03",
    category: "behavioral",
    prompt: "What kind of work environment do you prefer?",
    expectations: "Should mention preferences: hybrid/remote, part-time/contract",
  },

  // Education
  {
    id: "EDU-01",
    category: "education",
    prompt: "Tell me about your educational background.",
    expectations: "Should mention Master's at USC (2026), Bachelor's from University of Pokhara (2023)",
  },
  {
    id: "EDU-02",
    category: "education",
    prompt: "What relevant coursework have you completed?",
    expectations: "Should mention Data Analytics, Software Development, Database Management",
  },

  // Projects
  {
    id: "PROJ-01",
    category: "projects",
    prompt: "Tell me about a technical project you've built.",
    expectations: "Should describe specific projects with technologies used",
  },
  {
    id: "PROJ-02",
    category: "projects",
    prompt: "What's the most complex system you've worked on?",
    expectations: "Should mention B2B SaaS platform, microservices, or similar complex work",
  },
]

function sanitizeForMarkdown(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ")
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isGroqRateLimitError = (message: string) => message.includes("Groq API error: 429")

const parseSuggestedDelayMs = (message: string): number | null => {
  const match = message.match(/try again in ([0-9.]+)s/i)
  if (match) {
    const seconds = Number(match[1])
    if (!Number.isNaN(seconds)) {
      return Math.ceil(seconds * 1000)
    }
  }
  return null
}

async function persistResults(summary: { success: number; failure: number; averageMs: number }, results: TestResult[]) {
  const outputDir = path.resolve(__dirname, "../docs/test-results")
  await mkdir(outputDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const jsonPath = path.join(outputDir, `interview-${timestamp}.json`)
  const mdPath = path.join(outputDir, `interview-${timestamp}.md`)

  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        metadata: {
          generatedAt: new Date().toISOString(),
          testType: "interview",
          totalQueries: TEST_QUERIES.length,
          ...summary,
        },
        results,
      },
      null,
      2,
    ),
    "utf-8",
  )

  const mdLines = [
    `# Interview Test Run ${timestamp}`,
    "",
    `- Total queries: ${TEST_QUERIES.length}`,
    `- Success: ${summary.success}`,
    `- Failure: ${summary.failure}`,
    `- Average latency: ${(summary.averageMs / 1000).toFixed(2)}s`,
    "",
    "| ID | Category | Prompt | Duration (s) | Status | Source Types |",
    "| --- | --- | --- | --- | --- | --- |",
    ...results.map((result) => {
      const prompt = sanitizeForMarkdown(result.prompt.slice(0, 60) + (result.prompt.length > 60 ? "…" : ""))
      const duration = (result.durationMs / 1000).toFixed(2)
      const sources = result.sourceTypes?.join(", ") ?? "—"
      return `| ${result.id} | ${result.category} | ${prompt} | ${duration} | ${result.status} | ${sanitizeForMarkdown(sources)} |`
    }),
    "",
    "## Detailed Results",
    ...results.map((result) => {
      if (result.status === "success") {
        return [
          `### ${result.id}: ${result.category}`,
          `**Question:** ${result.prompt}`,
          `**Expected:** ${result.expectations}`,
          `**Answer Preview:** ${sanitizeForMarkdown(result.answerPreview ?? "(no preview)")}`,
          "",
        ].join("\n")
      }
      return [
        `### ${result.id}: ${result.category}`,
        `**Question:** ${result.prompt}`,
        `**Error:** ${sanitizeForMarkdown(result.errorMessage ?? "Unknown error")}`,
        "",
      ].join("\n")
    }),
  ]

  await writeFile(mdPath, mdLines.join("\n"), "utf-8")

  console.log(`\nResults written to:\n- ${jsonPath}\n- ${mdPath}`)
}

async function runTests() {
  console.log(`Running ${TEST_QUERIES.length} Interview RAG queries...`)
  console.log("Testing Digital Twin interview responses\n")

  const results: TestResult[] = []

  for (const [index, query] of TEST_QUERIES.entries()) {
    console.log(`\n[${query.id}] ${query.prompt.slice(0, 60)}${query.prompt.length > 60 ? "…" : ""}`)
    const queryStart = performance.now()
    let finalResult: TestResult | null = null

    for (let attempt = 1; attempt <= MAX_QUERY_ATTEMPTS; attempt++) {
      try {
        const response: InterviewResponse = await interviewQuery(query.prompt)
        const elapsed = performance.now() - queryStart
        const answerPreview =
          response.answer.slice(0, 280).replace(/\s+/g, " ") + (response.answer.length > 280 ? "…" : "")
        const sourceTypes = [...new Set(response.sources.map((s) => s.metadata?.type || "unknown"))]

        finalResult = {
          id: query.id,
          category: query.category,
          prompt: query.prompt,
          expectations: query.expectations,
          status: "success",
          durationMs: elapsed,
          answerPreview,
          sourceTypes,
        }

        console.log(`  ✓ Completed in ${(elapsed / 1000).toFixed(2)}s`)
        console.log(`    Sources: ${sourceTypes.join(", ")}`)
        console.log(`    Preview: ${answerPreview.slice(0, 100)}…`)
        break
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const rateLimited = isGroqRateLimitError(errorMessage)

        if (rateLimited && attempt < MAX_QUERY_ATTEMPTS) {
          const suggestedDelay = parseSuggestedDelayMs(errorMessage) ?? 4000
          const waitMs = Math.max(suggestedDelay, INTER_QUERY_DELAY_MS)
          console.warn(
            `  ⚠ Rate limit on attempt ${attempt}. Waiting ${(waitMs / 1000).toFixed(2)}s before retrying...`,
          )
          await wait(waitMs)
          continue
        }

        const elapsed = performance.now() - queryStart
        finalResult = {
          id: query.id,
          category: query.category,
          prompt: query.prompt,
          expectations: query.expectations,
          status: "error",
          durationMs: elapsed,
          errorMessage,
        }
        console.error(`  ✗ Failed after ${(elapsed / 1000).toFixed(2)}s: ${errorMessage}`)
        break
      }
    }

    if (!finalResult) {
      finalResult = {
        id: query.id,
        category: query.category,
        prompt: query.prompt,
        expectations: query.expectations,
        status: "error",
        durationMs: performance.now() - queryStart,
        errorMessage: "Unknown failure",
      }
    }

    results.push(finalResult)

    if (index !== TEST_QUERIES.length - 1) {
      await wait(INTER_QUERY_DELAY_MS)
    }
  }

  const success = results.filter((result) => result.status === "success").length
  const failure = results.length - success
  const averageMs =
    results.reduce((total, result) => total + (Number.isFinite(result.durationMs) ? result.durationMs : 0), 0) /
    results.length

  console.log("\n" + "=".repeat(60))
  console.log("INTERVIEW TEST SUMMARY")
  console.log("=".repeat(60))
  console.log(`Total: ${TEST_QUERIES.length} | Success: ${success} | Failed: ${failure}`)
  console.log(`Average latency: ${(averageMs / 1000).toFixed(2)}s`)
  console.log(`Pass rate: ${((success / TEST_QUERIES.length) * 100).toFixed(1)}%`)

  await persistResults({ success, failure, averageMs }, results)

  if (failure > 0) {
    process.exitCode = 1
  }
}

runTests().catch((error) => {
  console.error("Unexpected failure while running tests:", error)
  process.exit(1)
})
