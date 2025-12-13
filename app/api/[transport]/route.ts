import { createMcpHandler } from "mcp-handler";
import { searchFood, searchFoodTool } from "@/lib/food-search";

const handler = createMcpHandler(
  (server) => {
    server.tool(
      searchFoodTool.name,
      searchFoodTool.description,
      { query: searchFoodTool.schema.query, topK: searchFoodTool.schema.topK },
      async ({ query, topK }) => {
        const results = await searchFood({ query, topK: topK ?? 5 });

        const text = results.length
          ? results
              .map((r, i) => {
                const name = r.metadata?.name ?? r.id;
                const cuisine = r.metadata?.cuisine ?? "";
                const tags = r.metadata?.dietary_tags?.join(", ") || "none";
                const description = r.data ?? r.metadata?.description ?? "No description available";
                const ingredients = r.metadata?.ingredients?.join(", ") || "Not listed";
                const spiceLevel = r.metadata?.spice_level ?? "unknown";
                const prepTime = r.metadata?.preparation_time ?? "unknown";
                
                return `${i + 1}. **${name}** (${cuisine}) — score ${r.score.toFixed(2)}
   Spice Level: ${spiceLevel} | Prep Time: ${prepTime}
   Tags: ${tags}
   Ingredients: ${ingredients}
   Description: ${description}`;
              })
              .join("\n\n---\n\n")
          : "No matching dishes found.";

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
