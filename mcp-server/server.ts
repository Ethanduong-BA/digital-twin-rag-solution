import Anthropic from "@anthropic-ai/sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  Tool,
  TextContent,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// Type Definitions
// ============================================

interface MatchPoint {
  skill: string;
  description: string;
  proficiency: "expert" | "intermediate" | "beginner";
}

interface GapPoint {
  skill: string;
  importance: "critical" | "important" | "nice-to-have";
  reason: string;
}

interface ComparisonResult {
  jobTitle: string;
  company: string;
  matchPoints: MatchPoint[];
  gapPoints: GapPoint[];
  matchPercentage: number;
  overallScore: number;
  strengths: string[];
  areasToImprove: string[];
  recommendation: string;
}

// ============================================
// Tool Definition
// ============================================

const compareProfileWithJobTool: Tool = {
  name: "compare_profile_with_job",
  description:
    "Compare your profile against a job description. Analyzes skills match, identifies gaps, and provides a compatibility score (1-10).",
  inputSchema: {
    type: "object" as const,
    properties: {
      job_filename: {
        type: "string",
        description:
          "Name of the job file in jobs/ folder (e.g., 'week3-job01-the-star-entertainment-group-data-analyst.md')",
      },
    },
    required: ["job_filename"],
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Reads and parses a markdown job file
 */
function readJobFile(filename: string): {
  title: string;
  company: string;
  content: string;
} {
  // __dirname is dist or src directory
  // Go up 2 levels to project root
  const projectRoot = path.dirname(path.dirname(__dirname));
  const jobsDir = path.join(projectRoot, "jobs");
  const filePath = path.join(jobsDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Job file not found at: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");

  // Extract title and company from markdown
  const titleMatch = content.match(/Title:\s*(.+)/);
  const companyMatch = content.match(/Company:\s*(.+)/);

  return {
    title: titleMatch ? titleMatch[1].trim() : "Unknown",
    company: companyMatch ? companyMatch[1].trim() : "Unknown",
    content,
  };
}

/**
 * Reads the user's profile
 */
function readUserProfile(): string {
  try {
    const projectRoot = path.dirname(path.dirname(__dirname));
    const profilePath = path.join(
      projectRoot,
      "data",
      "my-profile.md"
    );

    if (fs.existsSync(profilePath)) {
      const stat = fs.statSync(profilePath);
      if (stat.isFile()) {
        return fs.readFileSync(profilePath, "utf-8");
      }
    }

    // Fallback: try to find profile.json in data-pipeline
    const jsonProfilePath = path.join(
      projectRoot,
      "data-pipeline",
      "raw_data",
      "profile.json"
    );

    if (fs.existsSync(jsonProfilePath)) {
      const stat = fs.statSync(jsonProfilePath);
      if (!stat.isFile()) {
        throw new Error(`Profile path is not a file: ${jsonProfilePath}`);
      }
      
      const content = fs.readFileSync(jsonProfilePath, "utf-8");
      try {
        const profile = JSON.parse(content);
        // Convert JSON profile to readable text format
        return convertProfileToText(profile);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON profile: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    }

    throw new Error(
      "Profile not found at data/my-profile.md or data-pipeline/raw_data/profile.json"
    );
  } catch (error) {
    throw new Error(
      `Failed to read profile: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Convert JSON profile to text format for analysis
 */
function convertProfileToText(profile: any): string {
  try {
    let text = "";

    // Basic info
    if (profile.personal_info) {
      const info = profile.personal_info;
      text += `Name: ${info.name || ""}\n`;
      text += `Email: ${info.email || ""}\n`;
      text += `Phone: ${info.phone || ""}\n`;
      text += `Location: ${info.location || ""}\n\n`;
    }

    // Summary
    if (profile.summary) {
      text += `Summary: ${profile.summary}\n\n`;
    }

    // Skills
    if (profile.skills && Array.isArray(profile.skills)) {
      text += "Skills: ";
      text += profile.skills.map((s: any) => typeof s === 'string' ? s : s.name).join(", ");
      text += "\n\n";
    }

    // Experience
    if (profile.experience && Array.isArray(profile.experience)) {
      text += "Experience:\n";
      profile.experience.forEach((exp: any) => {
        text += `- ${exp.title || ""} at ${exp.company || ""}\n`;
        if (exp.description) text += `  ${exp.description}\n`;
        if (exp.skills) text += `  Skills: ${Array.isArray(exp.skills) ? exp.skills.join(", ") : exp.skills}\n`;
      });
      text += "\n";
    }

    // Education
    if (profile.education && Array.isArray(profile.education)) {
      text += "Education:\n";
      profile.education.forEach((edu: any) => {
        text += `- ${edu.degree || ""} from ${edu.school || ""}\n`;
      });
      text += "\n";
    }

    // Projects
    if (profile.projects && Array.isArray(profile.projects)) {
      text += "Projects:\n";
      profile.projects.forEach((proj: any) => {
        text += `- ${proj.name || ""}: ${proj.description || ""}\n`;
        if (proj.skills) text += `  Skills: ${Array.isArray(proj.skills) ? proj.skills.join(", ") : proj.skills}\n`;
      });
      text += "\n";
    }

    // Certifications
    if (profile.certifications && Array.isArray(profile.certifications)) {
      text += "Certifications: ";
      text += profile.certifications.map((c: any) => typeof c === 'string' ? c : c.name).join(", ");
      text += "\n";
    }

    return text || JSON.stringify(profile, null, 2);
  } catch (error) {
    console.error("Error converting profile to text:", error);
    return JSON.stringify(profile, null, 2);
  }
}

/**
 * Core comparison logic using pattern matching and keyword analysis
 */
function analyzeProfileJobMatch(
  profile: string,
  jobContent: string,
  jobTitle: string,
  company: string
): ComparisonResult {
  // Define skill mappings for analysis
  const skillKeywords = {
    // Technical Skills
    "SQL/Database": {
      keywords: ["sql", "database", "query", "relational", "tsql", "mysql"],
      weight: 3,
    },
    "Power BI/Tableau":
      { keywords: ["power bi", "tableau", "looker", "qlik"], weight: 3 },
    Excel: { keywords: ["excel", "vba", "power query", "xlookup"], weight: 2 },
    Python: { keywords: ["python", "pandas", "numpy", "scikit"], weight: 3 },
    "Data Analysis": {
      keywords: ["data analysis", "statistical", "analytics", "modeling"],
      weight: 3,
    },
    "ETL/Data Pipeline": {
      keywords: ["etl", "pipeline", "extract", "transform", "airflow"],
      weight: 3,
    },
    Statistics: {
      keywords: ["statistics", "statistical", "regression", "hypothesis"],
      weight: 2,
    },
    "Data Visualization": {
      keywords: ["visualization", "dashboard", "charting", "reporting"],
      weight: 2,
    },
    // Soft Skills
    "Communication": {
      keywords: ["communication", "storytelling", "presentation", "articulate"],
      weight: 2,
    },
    "Problem Solving": {
      keywords: ["problem solving", "analytical", "critical thinking"],
      weight: 2,
    },
    "Attention to Detail": {
      keywords: ["attention to detail", "accuracy", "validation", "precision"],
      weight: 1,
    },
    Adaptability: {
      keywords: ["adaptability", "flexible", "dynamic", "fast-paced"],
      weight: 1,
    },
  };

  const profileLower = profile.toLowerCase();
  const jobLower = jobContent.toLowerCase();

  // Calculate matches
  const matchPoints: MatchPoint[] = [];
  const missingSkills: string[] = [];

  Object.entries(skillKeywords).forEach(([skill, config]) => {
    const hasSkillInProfile = config.keywords.some((kw) =>
      profileLower.includes(kw)
    );
    const requiresSkillInJob = config.keywords.some((kw) =>
      jobLower.includes(kw)
    );

    if (requiresSkillInJob) {
      if (hasSkillInProfile) {
        matchPoints.push({
          skill,
          description: `You have demonstrated ${skill} experience`,
          proficiency: determineProficiency(skill, profileLower),
        });
      } else {
        missingSkills.push(skill);
      }
    }
  });

  // Determine gap points
  const gapPoints: GapPoint[] = missingSkills.map((skill) => ({
    skill,
    importance: determineImportance(skill, jobLower),
    reason: `Required for role: ${jobTitle}`,
  }));

  // Calculate match percentage
  const totalRequiredSkills = matchPoints.length + gapPoints.length;
  const matchPercentage =
    totalRequiredSkills > 0
      ? Math.round((matchPoints.length / totalRequiredSkills) * 100)
      : 0;

  // Calculate overall score (1-10)
  const overallScore = Math.max(
    1,
    Math.min(10, Math.round((matchPercentage / 100) * 8 + 2))
  );

  // Generate recommendation
  const recommendation = generateRecommendation(
    overallScore,
    matchPoints,
    gapPoints,
    jobTitle
  );

  return {
    jobTitle,
    company,
    matchPoints,
    gapPoints,
    matchPercentage,
    overallScore,
    strengths: matchPoints.slice(0, 5).map((m) => m.skill),
    areasToImprove: gapPoints.slice(0, 5).map((g) => g.skill),
    recommendation,
  };
}

/**
 * Determine proficiency level based on profile content
 */
function determineProficiency(
  skill: string,
  profileText: string
): "expert" | "intermediate" | "beginner" {
  const skillLower = skill.toLowerCase();

  // Look for proficiency indicators
  const expertPatterns = [
    /advanced|expert|proficiency|mastery|extensive/i,
    /\d+\s*\+?\s*years?\s*experience/i,
  ];
  const intermediatePatterns = [/experience|working|familiar|used/i];

  const skillContext = profileText.substring(
    Math.max(0, profileText.indexOf(skillLower) - 100),
    profileText.indexOf(skillLower) + 100
  );

  if (expertPatterns.some((p) => p.test(skillContext))) {
    return "expert";
  } else if (intermediatePatterns.some((p) => p.test(skillContext))) {
    return "intermediate";
  }
  return "beginner";
}

/**
 * Determine importance of missing skill
 */
function determineImportance(
  skill: string,
  jobText: string
): "critical" | "important" | "nice-to-have" {
  const skillLower = skill.toLowerCase();

  // Look for importance indicators in job description
  const requiredPattern =
    /required|must have|essential|mandatory|critical/i;
  const preferredPattern = /preferred|nice to have|beneficial|desirable/i;

  const skillContext = jobText.substring(
    Math.max(0, jobText.indexOf(skillLower) - 150),
    jobText.indexOf(skillLower) + 150
  );

  if (requiredPattern.test(skillContext)) {
    return "critical";
  } else if (preferredPattern.test(skillContext)) {
    return "nice-to-have";
  }
  return "important";
}

/**
 * Generate personalized recommendation
 */
function generateRecommendation(
  score: number,
  matches: MatchPoint[],
  gaps: GapPoint[],
  jobTitle: string
): string {
  if (score >= 9) {
    return `Excellent fit for ${jobTitle}! Your profile closely aligns with the role requirements. You're highly competitive.`;
  } else if (score >= 7) {
    return `Good candidate for ${jobTitle}. You have most key skills. Focus on addressing the gaps before applying.`;
  } else if (score >= 5) {
    return `Moderate match for ${jobTitle}. Consider developing the critical missing skills to strengthen your candidacy.`;
  } else {
    return `This role may be challenging given your current profile. Recommend gaining experience in core required skills first.`;
  }
}

// ============================================
// Main Tool Handler
// ============================================

export async function handleCompareProfileWithJob(
  jobFilename: string
): Promise<ComparisonResult> {
  try {
    // Read job file
    const { title, company, content: jobContent } =
      readJobFile(jobFilename);

    // Read user profile
    const profileContent = readUserProfile();

    // Perform analysis
    const result = analyzeProfileJobMatch(
      profileContent,
      jobContent,
      title,
      company
    );

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error(`Profile comparison error: ${errorMsg}\n${stack}`);
    throw new Error(
      `Failed to compare profile with job: ${errorMsg}`
    );
  }
}

// ============================================
// Export for MCP Server Integration
// ============================================

export { compareProfileWithJobTool, ComparisonResult };
