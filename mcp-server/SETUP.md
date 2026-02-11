# 🔌 MCP Server Setup Guide

## ❌ Issues Fixed

1. **Wrong SDK Version**: `^0.1.0` → `^1.0.0`
2. **Invalid Imports**: Removed `@anthropic-sdk/sdk`, fixed handler imports
3. **Wrong Handler API**: `setRequestHandler(Schema)` → `setRequestHandler("tools/list")` & `setRequestHandler("tools/call")`
4. **Missing Client Transport**: Added `StdioClientTransport`

---

## ✅ Step-by-Step Setup

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

**Expected output:**
```
✓ Compilation successful
```

### 3. Test MCP Connection

```bash
npm test
```

**Expected output:**
```
🔌 Starting MCP Server test...
📡 Connecting to MCP Server...
✅ Connected successfully

📋 Listing available tools...
✅ Tools available: ...

🧪 Testing compare_profile_with_job tool...
✅ Tool executed successfully:
```

---

## 🚀 Production Usage

### Start Server

```bash
npm start
```

Or with ts-node:

```bash
npm run dev
```

### Server should output:

```
Digital Twin MCP Server started
```

---

## 🔌 Client Configuration

Use `.mcp.json` to configure MCP client:

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"]
    }
  }
}
```

### Use with Claude:

1. Copy `.mcp.json` to `~/.config/cline/mcp.json` (or relevant config path)
2. Restart Claude/Cline
3. Claude will now have access to `compare_profile_with_job` tool

---

## 🧪 Test Tool Usage

```bash
# Server running in background
npm start

# In another terminal, test:
npm test
```

### Manual test with curl:

```bash
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "compare_profile_with_job",
    "arguments": {
      "job_filename": "week3-job01-the-star-entertainment-group-data-analyst.md"
    }
  }'
```

---

## 📁 File Structure

```
mcp-server/
├── index.ts              ✅ MCP Server (Fixed)
├── server.ts             ✅ Tool Logic
├── client-test.ts        ✅ Test Client
├── package.json          ✅ Fixed versions
├── tsconfig.json         ✅ Updated
└── README.md
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@modelcontextprotocol/sdk'"

```bash
npm install
npm run build
```

### Error: "tools/list is not a valid request method"

Make sure `index.ts` has correct handler names:
- `setRequestHandler("tools/list", ...)`
- `setRequestHandler("tools/call", ...)`

### Error: "Profile file not found"

Create profile file at one of these locations:
- `data/my-profile.md`
- `data-pipeline/raw_data/profile.json`

### Server won't start

Check Node.js version:
```bash
node --version  # Should be 18+
```

---

## 📊 Files Status

| File | Status | Changes |
|------|--------|---------|
| `package.json` | ✅ Fixed | Updated SDK to ^1.0.0 |
| `index.ts` | ✅ Fixed | Correct handler API |
| `server.ts` | ✅ OK | No changes needed |
| `tsconfig.json` | ✅ Updated | Added allowSyntheticDefaultImports |
| `client-test.ts` | ✅ New | Test client added |
| `.mcp.json` | ✅ New | Config file added |

---

## 🎯 Next Steps

1. ✅ Fix npm install errors
2. ✅ Build project: `npm run build`
3. ✅ Test connection: `npm test`
4. ✅ Configure client
5. ✅ Use with Claude/Cline

**Now ready to connect!** 🚀
