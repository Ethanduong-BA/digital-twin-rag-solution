#!/usr/bin/env ts-node
/**
 * Direct stdio communication test
 * Tests server communication without client wrapper
 */
import { spawn } from "child_process";
async function testStdioComm() {
    console.log("🔧 Testing direct stdio communication with MCP server...\n");
    // Spawn server
    const serverProcess = spawn("node", ["dist/index.js"], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
    });
    let receivedData = "";
    let errorData = "";
    // Handle server output
    serverProcess.stdout?.on("data", (data) => {
        receivedData += data.toString();
        console.log("📨 Server stdout:", data.toString());
    });
    serverProcess.stderr?.on("data", (data) => {
        errorData += data.toString();
        console.log("⚠️  Server stderr:", data.toString());
    });
    serverProcess.on("error", (error) => {
        console.error("❌ Server process error:", error);
        process.exit(1);
    });
    // Wait a bit for server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Send JSON-RPC request to list tools
    const listToolsRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
    };
    console.log("\n📤 Sending tools/list request...");
    console.log("Request:", JSON.stringify(listToolsRequest));
    serverProcess.stdin?.write(JSON.stringify(listToolsRequest) + "\n");
    // Wait for response
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("\n✅ Test completed");
    serverProcess.kill();
    process.exit(0);
}
testStdioComm().catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
});
