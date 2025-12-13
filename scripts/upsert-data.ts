import dotenv from "dotenv"
import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

import { Index } from "@upstash/vector"

interface FoodItem {
  id: string
  name: string
  cuisine: string
  region: string
  dish_type: string
  category: string[]
  description: string
  ingredients: string[]
  cooking_methods: string[]
  nutritional_benefits: string
  cultural_background: string
  dietary_tags: string[]
  allergens: string[]
  spice_level: string
  preparation_time: string
  [key: string]: unknown
}

const REQUIRED_ENV_VARS = ["UPSTASH_VECTOR_REST_URL", "UPSTASH_VECTOR_REST_TOKEN"] as const

type RequiredEnv = (typeof REQUIRED_ENV_VARS)[number]

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({
  path: path.resolve(__dirname, "../.env.local"),
  override: false,
})

const DATA_PATH = path.resolve(__dirname, "../data/food_data.json")

function ensureEnv(): Record<RequiredEnv, string> {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`)
  }

  return {
    UPSTASH_VECTOR_REST_URL: process.env.UPSTASH_VECTOR_REST_URL!,
    UPSTASH_VECTOR_REST_TOKEN: process.env.UPSTASH_VECTOR_REST_TOKEN!,
  }
}

function buildDocument(item: FoodItem): string {
  const lines = [
    `${item.name} | Cuisine: ${item.cuisine} | Region: ${item.region}`,
    `Dish Type: ${item.dish_type} | Categories: ${item.category.join(", ")}`,
    "",
    item.description,
    "",
    `Ingredients: ${item.ingredients.join(", ")}`,
    `Cooking Methods: ${item.cooking_methods.join(", ")}`,
    `Dietary Tags: ${item.dietary_tags.join(", ")}`,
    `Allergens: ${item.allergens.join(", ") || "None"}`,
    `Nutritional Benefits: ${item.nutritional_benefits}`,
    `Cultural Background: ${item.cultural_background}`,
    `Spice Level: ${item.spice_level} | Prep Time: ${item.preparation_time}`,
  ]

  return lines.join("\n")
}

async function loadFoodData(): Promise<FoodItem[]> {
  const contents = await readFile(DATA_PATH, "utf-8")
  const parsed = JSON.parse(contents)

  if (!Array.isArray(parsed)) {
    throw new Error("food_data.json must contain an array of items")
  }

  return parsed
}

async function upsertItems() {
  const env = ensureEnv()
  const items = await loadFoodData()

  const index = new Index({
    url: env.UPSTASH_VECTOR_REST_URL,
    token: env.UPSTASH_VECTOR_REST_TOKEN,
  })

  let successCount = 0
  let failureCount = 0

  for (const item of items) {
    try {
      await index.upsert({
        id: item.id,
        data: buildDocument(item),
        metadata: item,
      })
      successCount += 1
      console.log(`✓ Upserted ${item.name} (${item.id})`)
    } catch (error) {
      failureCount += 1
      console.error(`✗ Failed to upsert ${item.id}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`\nUpload complete. ${successCount} succeeded, ${failureCount} failed.`)

  if (failureCount > 0) {
    process.exitCode = 1
  }
}

upsertItems().catch((error) => {
  console.error("Unexpected error while uploading data:", error instanceof Error ? error.message : error)
  process.exit(1)
})
