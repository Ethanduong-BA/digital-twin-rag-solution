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
      console.error(`[MCP] Arguments type: ${typeof args}`);
      console.error(`[MCP] Arguments:`, JSON.stringify(args));

      if (name === "compare_profile_with_job") {
        // Validate arguments exist
        if (!args || typeof args !== "object") {
          const errorMsg = `Missing arguments object`;
          console.error(`[MCP] Validation failed: ${errorMsg}`);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${errorMsg}. Expected: { job_filename: "filename.md" }`,
              },
            ],
            isError: true,
          };
        }

        // Validate job_filename parameter
        const jobFilename = args.job_filename;
        
        console.error(`[MCP] jobFilename value: "${jobFilename}"`);
        console.error(`[MCP] jobFilename type: ${typeof jobFilename}`);
        
        if (!jobFilename || typeof jobFilename !== "string" || jobFilename.trim() === "") {
          const errorMsg = `job_filename parameter is required and must be a non-empty string. Received: "${jobFilename}" (type: ${typeof jobFilename})`;
          console.error(`[MCP] Validation failed: ${errorMsg}`);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${errorMsg}. Example: "week3-job01-the-star-entertainment-group-data-analyst.md"`,
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
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[MCP] Tool execution error:`, errorMsg);
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
  try {
    console.error("[MCP] Initializing server...");
    const transport = new StdioServerTransport();
    console.error("[MCP] Transport created");
    
    await server.connect(transport);
    console.error("[MCP] Server connected successfully");
  } catch (error) {
    console.error("[MCP] Server initialization error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[MCP] Unhandled main error:", error);
  process.exit(1);
});
