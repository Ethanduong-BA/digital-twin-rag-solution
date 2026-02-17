#!/usr/bin/env ts-node
/**
 * Validation script to test MCP server execution
 * Validates that the server can be started and the tool can be called
 */
import { spawn } from "child_process";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
async function validateServer() {
    console.log("🔍 Validating MCP Server...\n");
    // Spawn the server
    const serverProcess = spawn("node", ["dist/index.js"], {
        cwd: process.cwd(),
    });
    // Create transport and client
    const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"],
        stderr: "pipe",
    });
    const client = new Client({
        name: "validator",
        version: "1.0.0",
    }, {
        capabilities: {},
    });
    try {
        // Connect
        console.log("📡 Connecting to server...");
        await client.connect(transport);
        console.log("✅ Connected successfully\n");
        // List tools
        console.log("📋 Listing available tools...");
        const response = await client.listTools();
        console.log(`Found ${response.tools.length} tool(s):`);
        response.tools.forEach((tool) => {
            console.log(`  ✓ ${tool.name}`);
        });
        console.log();
        // Test tool execution
        console.log("🧪 Testing tool execution...");
        const result = await client.callTool({
            name: "compare_profile_with_job",
            arguments: {
                job_filename: "week3-job01-the-star-entertainment-group-data-analyst.md",
            },
        });
        if (result && Array.isArray(result.content) && result.content.length > 0) {
            const content = result.content[0];
            if (content && "type" in content && content.type === "text" && "text" in content) {
                try {
                    const parsed = JSON.parse(content.text);
                    console.log("✅ Tool execution successful!\n");
                    console.log("📊 Results:");
                    console.log(`  Overall Score: ${parsed.overallScore}/10`);
                    console.log(`  Match Percentage: ${parsed.matchPercentage}%`);
                    console.log(`  Matching Skills: ${parsed.matchPoints.length}`);
                    console.log(`  Skill Gaps: ${parsed.gapPoints.length}`);
                }
                catch (e) {
                    console.error("❌ Failed to parse tool result:", e);
                }
            }
        }
        console.log("\n✅ Server validation complete!");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Validation failed:", error);
        process.exit(1);
    }
}
validateServer();
