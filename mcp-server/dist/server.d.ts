import { Tool } from "@modelcontextprotocol/sdk/types.js";
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
declare const compareProfileWithJobTool: Tool;
export declare function handleCompareProfileWithJob(jobFilename: string): Promise<ComparisonResult>;
export { compareProfileWithJobTool, ComparisonResult };
