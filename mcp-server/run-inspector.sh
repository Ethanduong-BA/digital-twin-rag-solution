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
