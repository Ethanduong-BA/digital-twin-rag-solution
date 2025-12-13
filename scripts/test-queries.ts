import dotenv from "dotenv"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { performance } from "node:perf_hooks"
import process from "node:process"

import { ragQuery, type RAGResponse } from "../app/actions"

dotenv.config({
  path: path.resolve(__dirname, "../.env.local"),
  override: false,
})

interface TestQuery {
  id: string
  category: "semantic" | "multi-criteria" | "nutritional" | "cultural" | "cooking-method"
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
  sourceIds?: string[]
  errorMessage?: string
}

const INTER_QUERY_DELAY_MS = 4000
const MAX_QUERY_ATTEMPTS = 3

const TEST_QUERIES: TestQuery[] = [
  {
    id: "SEM-01",
    category: "semantic",
    prompt: "healthy Mediterranean options with grains and herbs",
    expectations: "Should surface couscous salad or lentil tabbouleh entries",
  },
  {
    id: "SEM-02",
    category: "semantic",
    prompt: "street food dishes with smoky flavors",
    expectations: "Expect tlayuda, pad thai, or grilled jerk bowls",
  },
  {
    id: "SEM-03",
    category: "semantic",
    prompt: "comfort foods featuring long-simmered stews",
    expectations: "Should highlight tagine, gumbo, koresh, or callaloo",
  },
  {
    id: "SEM-04",
    category: "semantic",
    prompt: "fermented dishes with tangy profiles",
    expectations: "Bibimbap, dosa, injera feast should appear",
  },
  {
    id: "SEM-05",
    category: "semantic",
    prompt: "desserts with caramelized or burnt sugar tops",
    expectations: "Basque burnt cheesecake should dominate",
  },
  {
    id: "MC-01",
    category: "multi-criteria",
    prompt: "spicy vegetarian Asian dishes ready in under an hour",
    expectations: "Masala dosa, bibimbap lite, or shakshuka variations",
  },
  {
    id: "MC-02",
    category: "multi-criteria",
    prompt: "pescatarian bowls with citrus notes and something grilled",
    expectations: "Ceviche, Nordic salmon bowl, or cha ca",
  },
  {
    id: "MC-03",
    category: "multi-criteria",
    prompt: "handheld foods combining sweet and savory flavors",
    expectations: "Empanadas, tlayuda wedges, or jerk jackfruit bowl components",
  },
  {
    id: "NUT-01",
    category: "nutritional",
    prompt: "high-protein low-carb foods suitable for meal prep",
    expectations: "Quinoa bowl, lentil tabbouleh, or salmon bowl",
  },
  {
    id: "NUT-02",
    category: "nutritional",
    prompt: "omega-3 rich dinners with whole grains",
    expectations: "Nordic salmon bowl or cha ca grilled fish",
  },
  {
    id: "NUT-03",
    category: "nutritional",
    prompt: "anti-inflammatory vegan dishes that use turmeric or ginger",
    expectations: "Mumbai turmeric stew or jerk jackfruit bowl",
  },
  {
    id: "CULT-01",
    category: "cultural",
    prompt: "traditional comfort foods from Ethiopia or East Africa",
    expectations: "Addis injera feast or Rift Valley lentil soup",
  },
  {
    id: "CULT-02",
    category: "cultural",
    prompt: "foods that tell migration stories between cultures",
    expectations: "Nikkei ceviche, shakshuka, or couscous salad",
  },
  {
    id: "COOK-01",
    category: "cooking-method",
    prompt: "dishes that can be grilled tableside or outdoors with diners involved",
    expectations: "Huli huli chicken, cha ca grilled fish, or jerk jackfruit",
  },
  {
    id: "COOK-02",
    category: "cooking-method",
    prompt: "recipes relying on cast-iron cooking or skillets",
    expectations: "Shakshuka, pot pie, or skillet-based ramen",
  },
  {
    id: "COOK-03",
    category: "cooking-method",
    prompt: "foods simmered or baked in cast-iron dutch ovens for sharing",
    expectations: "Chicken pot pie, gumbo, or lasagna",
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
  const jsonPath = path.join(outputDir, `run-${timestamp}.json`)
  const mdPath = path.join(outputDir, `run-${timestamp}.md`)

  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        metadata: {
          generatedAt: new Date().toISOString(),
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
    `# Test Run ${timestamp}`,
    "",
    `- Total queries: ${TEST_QUERIES.length}`,
    `- Success: ${summary.success}`,
    `- Failure: ${summary.failure}`,
    `- Average latency: ${(summary.averageMs / 1000).toFixed(2)}s`,
    "",
    "| ID | Category | Prompt | Duration (s) | Status | Sources |",
    "| --- | --- | --- | --- | --- | --- |",
    ...results.map((result) => {
      const prompt = sanitizeForMarkdown(result.prompt)
      const duration = (result.durationMs / 1000).toFixed(2)
      const sources = result.sourceIds?.join(", ") ?? "—"
      return `| ${result.id} | ${result.category} | ${prompt} | ${duration} | ${result.status} | ${sanitizeForMarkdown(sources)} |`
    }),
    "",
    "## Notes",
    ...results.map((result) => {
      if (result.status === "success") {
        return `- **${result.id}**: ${sanitizeForMarkdown(result.answerPreview ?? "(no preview)")}`
      }
      return `- **${result.id}**: Error - ${sanitizeForMarkdown(result.errorMessage ?? "Unknown error")}`
    }),
  ]

  await writeFile(mdPath, mdLines.join("\n"), "utf-8")

  console.log(`\nResults written to:\n- ${jsonPath}\n- ${mdPath}`)
}

async function runTests() {
  console.log(`Running ${TEST_QUERIES.length} RAG queries...`)

  const results: TestResult[] = []

  for (const [index, query] of TEST_QUERIES.entries()) {
    console.log(`\n[${query.id}] ${query.prompt}`)
    const queryStart = performance.now()
    let finalResult: TestResult | null = null

    for (let attempt = 1; attempt <= MAX_QUERY_ATTEMPTS; attempt++) {
      try {
        const response: RAGResponse = await ragQuery(query.prompt)
        const elapsed = performance.now() - queryStart
        const answerPreview =
          response.answer.slice(0, 220).replace(/\s+/g, " ") + (response.answer.length > 220 ? "…" : "")
        const sourceIds = response.sources.map((source) => source.id)

        finalResult = {
          id: query.id,
          category: query.category,
          prompt: query.prompt,
          expectations: query.expectations,
          status: "success",
          durationMs: elapsed,
          answerPreview,
          sourceIds,
        }

        console.log(`  ✓ Completed in ${(elapsed / 1000).toFixed(2)}s with ${response.sources.length} sources`)
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

  await persistResults({ success, failure, averageMs }, results)

  if (failure > 0) {
    process.exitCode = 1
  }
}

runTests().catch((error) => {
  console.error("Unexpected failure while running tests:", error)
  process.exit(1)
})
