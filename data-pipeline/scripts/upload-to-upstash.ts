import { Index } from "@upstash/vector";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

const currentDir = process.cwd();
dotenv.config({ path: path.resolve(currentDir, "../.env") });

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

async function uploadData() {
  try {
    const dataPath = path.resolve(currentDir, "raw_data/profile.json");
    const profile = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    console.log("🚀 Syncing with Upstash Integrated Embedding Model...");

    // Use 'data' field instead of 'vector' to let Upstash handle embeddings
    await index.upsert([{
      id: "ethan-duong-knowledge-base",
      data: JSON.stringify(profile), // The model will automatically vectorize this text
      metadata: {
        fullname: profile.personal_info?.name,
        role: profile.personal_info?.role,
        projects: profile.projects?.map((p: any) => p.name).join(", ")
      }
    }]);

    console.log("✅ Success: Knowledge base is now searchable for Chat!");
  } catch (error) {
    console.error("❌ Upload failed:", error);
  }
}

uploadData();