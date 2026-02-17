#!/usr/bin/env ts-node
/**
 * Test parameter validation
 */
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
async function testParamValidation() {
    console.log("🔍 Testing parameter validation...\n");
    // Spawn the server
    const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"],
        stderr: "pipe",
    });
    const client = new Client({
        name: "test-validator",
        version: "1.0.0",
    }, {
        capabilities: {},
    });
    try {
        await client.connect(transport);
        console.log("✅ Connected to server\n");
        // Test 1: Empty string
        console.log("Test 1: Empty string parameter");
        const result1 = await client.callTool({
            name: "compare_profile_with_job",
            arguments: {
                job_filename: "",
            },
        });
        console.log("Response:", JSON.stringify(result1, null, 2));
        console.log();
        // Test 2: Valid filename
        console.log("Test 2: Valid filename parameter");
        const result2 = await client.callTool({
            name: "compare_profile_with_job",
            arguments: {
                job_filename: "week3-job01-the-star-entertainment-group-data-analyst.md",
            },
        });
        if (result2 && Array.isArray(result2.content) && result2.content[0]) {
            const content = result2.content[0];
            if ("text" in content) {
                try {
                    const parsed = JSON.parse(content.text);
                    console.log("✅ Valid result - Overall Score:", parsed.overallScore);
                }
                catch (e) {
                    console.log("Content:", content.text.substring(0, 100));
                }
            }
        }
        console.log();
        console.log("✅ Validation tests completed");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}
testParamValidation();
