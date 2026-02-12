#!/bin/bash

# MCP Inspector Wrapper
# Usage: ./run-inspector.sh

cd "$(dirname "$0")" || exit 1

echo "🚀 Starting MCP Inspector..."
echo "📡 Endpoint: http://localhost:6274"
echo ""
echo "Server command: node dist/index.js"
echo ""

npx @modelcontextprotocol/inspector node dist/index.js

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Trong request handler của tools/call
server.setRequestHandler({ method: "tools/call" } as any, async (request: any) => {
  const { name, arguments: args } = request.params;

  if (name === "compare_profile_with_job") {
    // Logic lấy dữ liệu từ Upstash của bạn
    
    // Gọi Groq để phân tích
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: `So sánh hồ sơ này với JD: ${args.job_filename}` }],
      model: "llama3-8b-8192",
    });

    return {
      content: [{ type: "text", text: completion.choices[0].message.content }]
    };
  }
});