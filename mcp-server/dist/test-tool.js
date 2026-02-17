import { spawn } from "child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
async function testMCPServer() {
    console.log("🚀 Starting MCP Server test...\n");
    // Start the server process
    const serverProcess = spawn("node", ["dist/index.js"], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "inherit"],
    });
    if (!serverProcess.stdin || !serverProcess.stdout) {
        throw new Error("Failed to start server process");
    }
    // Create client with stdio transport
    const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"],
        env: process.env,
    });
    const client = new Client({
        name: "test-client",
        version: "1.0.0",
    }, {
        capabilities: {},
    });
    try {
        console.log("📡 Connecting to server...");
        await client.connect(transport);
        console.log("✅ Connected to server\n");
        // List available tools
        console.log("📋 Listing available tools...");
        const toolsList = await client.listTools();
        console.log(`Found ${toolsList.tools.length} tool(s):`);
        toolsList.tools.forEach((tool) => {
            console.log(`  - ${tool.name}: ${tool.description}`);
        });
        console.log("\n🧪 Testing compare_profile_with_job tool...");
        // Test the tool with a real job
        const result = await client.callTool({
            name: "compare_profile_with_job",
            arguments: {
                job_filename: "week3-job01-the-star-entertainment-group-data-analyst.md",
            },
        });
        console.log("\n✅ Tool execution successful!");
        console.log("\nResult:");
        console.log(JSON.stringify(result.content, null, 2));
        await client.close();
        console.log("\n✅ Test completed successfully!");
    }
    catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    }
    finally {
        serverProcess.kill();
    }
}
testMCPServer().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
