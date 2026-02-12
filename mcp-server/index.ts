// Sửa dòng này trong index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  StdioServerTransport,
} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  compareProfileWithJobTool,
  handleCompareProfileWithJob,
} from "./server.js";

// ============================================
// MCP Server Setup
// ============================================

const server = new Server(
  {
    name: "digital-twin-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================
// List Tools Handler
// ============================================

server.setRequestHandler(ListToolsRequestSchema, async (_request: any) => {
  return {
    tools: [compareProfileWithJobTool],
  };
});

// ============================================
// Call Tool Handler
// ============================================

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: any) => {
    try {
      const params = request.params;
      const { name, arguments: args } = params;

      console.error(`[MCP] Tool called: ${name}`);
      console.error(`[MCP] Arguments:`, JSON.stringify(args));

      if (name === "compare_profile_with_job") {
        // Validate job_filename parameter
        const jobFilename = args?.job_filename;
        
        console.error(`[MCP] jobFilename value: "${jobFilename}"`);
        console.error(`[MCP] jobFilename type: ${typeof jobFilename}`);
        console.error(`[MCP] jobFilename truthy: ${!!jobFilename}`);
        
        if (!jobFilename || typeof jobFilename !== "string" || jobFilename.trim() === "") {
          const errorMsg = `Missing or invalid job_filename parameter. Received: "${jobFilename}" (type: ${typeof jobFilename})`;
          console.error(`[MCP] Validation failed: ${errorMsg}`);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${errorMsg}`,
              },
            ],
            isError: true,
          };
        }

        try {
          const result = await handleCompareProfileWithJob(jobFilename);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    } catch (error) {
      console.error("[MCP] Handler error:", error);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Unknown tool`,
        },
      ],
      isError: true,
    };
  }
);

// ============================================
// Server Transport
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Digital Twin MCP Server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
