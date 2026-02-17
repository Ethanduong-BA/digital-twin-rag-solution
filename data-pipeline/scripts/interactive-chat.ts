import { Index } from "@upstash/vector";
import * as dotenv from "dotenv";
import path from "path";
import readline from "readline";

// Load environment variables from the root .env
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("🤖 Digital Twin Terminal Chat is ready!");
console.log("Type your question about Ethan's profile (or 'exit' to quit).");

function askQuestion() {
  rl.question("\n👤 You: ", async (query) => {
    if (query.toLowerCase() === 'exit') {
      console.log("Goodbye! 👋");
      rl.close();
      return;
    }

    try {
      // Querying the Vector DB with your natural language question
      const results = await index.query({
        data: query,
        topK: 1,
        includeMetadata: true,
      });

      if (results.length > 0 && results[0].metadata) {
        console.log("🤖 Assistant:");
        // Displaying the matched metadata from your profile.json
        console.log(JSON.stringify(results[0].metadata, null, 2));
      } else {
        console.log("🤖 Assistant: I couldn't find any specific information about that in Ethan's profile.");
      }
    } catch (error) {
      console.error("❌ Error connecting to Upstash:", error);
    }

    askQuestion(); // Loop to keep chatting
  });
}

askQuestion();