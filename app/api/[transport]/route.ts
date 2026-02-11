import { createMcpHandler } from "mcp-handler";
import {
  searchProfile,
  searchProfileTool,
  getProfileSection,
  getProfileSectionTool,
  formatProfileResultsAsContext,
  PROFILE_SECTIONS,
} from "@/lib/profile-search";
import { runInterviewSimulation } from "@/lib/interview-simulator";

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

    // ----- Run Interview Simulation Tool -----
    server.tool(
      "run_interview",
      "Run an interview simulation for a specific job. Generates questions across categories (HR, Technical, Team, Experience, Academic), answers them as the Digital Twin, and provides a pass/fail evaluation.",
      {
        jobTitle: { type: "string", description: "The job title being interviewed for" },
        company: { type: "string", description: "The company name" },
        requiredSkills: {
          type: "array",
          items: { type: "string" },
          description: "List of required skills from the job description",
        },
      },
      async ({ jobTitle, company, requiredSkills }) => {
        const result = await runInterviewSimulation({
          jobTitle: jobTitle as string,
          company: company as string,
          requiredSkills: requiredSkills as string[],
        });

        const lines = [
          `# Interview Simulation: ${result.jobTitle} at ${result.company}`,
          "",
          `## Result: ${result.passed ? "✅ PASS" : "❌ FAIL"} (${result.score}%)`,
          "",
          result.recommendation,
          "",
          "## Q&A Summary",
        ];

        for (const q of result.questions) {
          lines.push(`\n### [${q.category}] ${q.question}`);
          lines.push(`**Answer:** ${q.answer}`);
          lines.push(`*Score: ${q.score}/100 - ${q.evaluation}*`);
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
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
