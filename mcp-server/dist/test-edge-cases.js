#!/usr/bin/env ts-node
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
async function test() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"],
        stderr: "pipe",
    });
    const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
    try {
        await client.connect(transport);
        console.log("Testing edge cases...\n");
        // Test 1: No arguments at all
        console.log("Test 1: No arguments");
        try {
            const result = await client.callTool({
                name: "compare_profile_with_job",
                arguments: {},
            });
            console.log(JSON.stringify(result, null, 2));
        }
        catch (e) {
            console.log("Error:", e);
        }
        console.log();
        // Test 2: Undefined
        console.log("Test 2: Undefined argument");
        try {
            const result = await client.callTool({
                name: "compare_profile_with_job",
                arguments: {
                    job_filename: undefined,
                },
            });
            console.log(JSON.stringify(result, null, 2));
        }
        catch (e) {
            console.log("Error:", e);
        }
        console.log();
        // Test 3: Null
        console.log("Test 3: Null argument");
        try {
            const result = await client.callTool({
                name: "compare_profile_with_job",
                arguments: {
                    job_filename: null,
                },
            });
            console.log(JSON.stringify(result, null, 2));
        }
        catch (e) {
            console.log("Error:", e);
        }
        process.exit(0);
    }
    catch (e) {
        console.error("Failed:", e);
        process.exit(1);
    }
}
test();
