import { Index } from "@upstash/vector";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

// 1. Get the current working directory (should be /data-pipeline)
const currentDir = process.cwd();

// 2. Load .env from the root folder (two levels up from /data-pipeline/scripts)
dotenv.config({ path: path.resolve(currentDir, "../.env") });

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Generate a simple embedding vector from profile text
function generateEmbedding(text: string): number[] {
  const vector = Array(1536).fill(0);
  
  // Simple hash-based approach: distribute text characters across vector dimensions
  for (let i = 0; i < text.length; i++) {
    const index = i % 1536;
    vector[index] += text.charCodeAt(i) / 256;
  }
  
  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }
  
  return vector;
}

async function uploadData() {
  try {
    // 3. Define path to profile.json based on current directory
    const dataPath = path.resolve(currentDir, "raw_data/profile.json");
    
    console.log(`🔍 Looking for profile at: ${dataPath}`);
    
    if (!fs.existsSync(dataPath)) {
      throw new Error("File profile.json not found! Make sure you are in the /data-pipeline directory.");
    }

    const rawData = fs.readFileSync(dataPath, "utf-8");
    const profile = JSON.parse(rawData);

    console.log("🚀 Syncing Digital Twin data to Upstash...");

    // Extract profile data with correct field mappings
    const profileText = JSON.stringify(profile);
    const embeddingVector = generateEmbedding(profileText);

    // Build comprehensive metadata from profile
    const experienceSummary = profile.experience
      ?.map((exp: any) => `${exp.position} at ${exp.company}`)
      .join("; ") || "N/A";

    const skillsList = profile.technical_skills
      ? Object.values(profile.technical_skills).flat().join("; ")
      : "N/A";

    await index.upsert([{
      id: "ethan-duong-profile",
      vector: embeddingVector,
      metadata: {
        fullname: profile.personal_info?.name || "N/A",
        role: profile.personal_info?.role || "N/A",
        email: profile.personal_info?.contact?.email || "N/A",
        location: profile.personal_info?.location || "N/A",
        experience: experienceSummary,
        skills: skillsList,
        projects: (profile.projects || []).join("; "),
        career_objective: profile.personal_info?.career_objective || "N/A"
      }
    }]);

    console.log("✅ Success: Digital Twin knowledge base updated on Upstash!");
    console.log(`📊 Uploaded profile for: ${profile.personal_info?.name}`);
  } catch (error) {
    console.error("❌ Upload failed:", error);
    process.exit(1);
  }
}

uploadData();