import { Index } from "@upstash/vector";
import * as dotenv from "dotenv";
import path from "path";

const currentDir = process.cwd();
dotenv.config({ path: path.resolve(currentDir, "../.env") });

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

async function checkVectors() {
  try {
    console.log("🔍 Checking vectors in Upstash...\n");

    // Query for all Ethan vectors
    const results = await index.query({
      data: "Khoa Duong profile skills projects experience",
      topK: 100, // Get top 100 results
      includeMetadata: true,
    });

    console.log(`✅ Found ${results.length} vectors matching query\n`);

    // Categorize by type
    const byType: { [key: string]: number } = {};
    results.forEach((result) => {
      const type = (result.metadata as any)?.type || "unknown";
      byType[type] = (byType[type] || 0) + 1;
    });

    console.log("📊 Vector Types Breakdown:");
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count}`);
    });

    console.log(`\n📈 Total vectors retrieved: ${results.length}`);
    console.log("\n🎯 Sample vectors:");
    results.slice(0, 5).forEach((result, idx) => {
      console.log(`\n${idx + 1}. ID: ${result.id}`);
      console.log(`   Type: ${(result.metadata as any)?.type}`);
      console.log(`   Score: ${result.score?.toFixed(3)}`);
    });
  } catch (error) {
    console.error("❌ Check failed:", error);
    process.exit(1);
  }
}

checkVectors();
