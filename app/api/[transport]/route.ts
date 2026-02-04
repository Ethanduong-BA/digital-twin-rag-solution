import { createMcpHandler } from "mcp-handler";
import {
  searchProfile,
  searchProfileTool,
  getProfileSection,
  getProfileSectionTool,
  formatProfileResultsAsContext,
} from "@/lib/profile-search";

const handler = createMcpHandler(
  (server) => {
    // ----- Profile Search Tool (Digital Twin) -----
    server.tool(
      searchProfileTool.name,
      searchProfileTool.description,
      { query: searchProfileTool.schema.query, topK: searchProfileTool.schema.topK },
      async ({ query, topK }) => {
        const results = await searchProfile({ query, topK: topK ?? 5 });

        const text = results.length
          ? results
              .map((r, i) => {
                const type = r.metadata?.type ?? "info";
                const score = r.score.toFixed(2);
                return `${i + 1}. [${type.toUpperCase()}] (score: ${score})\n${r.data}`;
              })
              .join("\n\n---\n\n")
          : "No matching profile information found.";

        return { content: [{ type: "text", text }] };
      }
    );

    // ----- Get Profile Section Tool (Digital Twin) -----
    server.tool(
      getProfileSectionTool.name,
      getProfileSectionTool.description,
      { section: getProfileSectionTool.schema.section },
      async ({ section }) => {
        const results = await getProfileSection({ section });
        const text = formatProfileResultsAsContext(results);
        return { content: [{ type: "text", text }] };
      }
    );
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
