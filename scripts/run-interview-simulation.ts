/**
 * Interview Simulation Script
 *
 * Reads job descriptions from /jobs folder, runs interview simulations
 * using the Digital Twin, and generates result files in /interview folder.
 *
 * Usage: npx tsx scripts/run-interview-simulation.ts
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

import { searchProfile, formatProfileResultsAsContext } from "../lib/profile-search";

// Configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";
const QUESTIONS_PER_CATEGORY = 1; // Reduced to avoid rate limits

// Interview question categories
const QUESTION_CATEGORIES = [
  "HR/Behavioral",
  "Technical",
  "Team/Culture",
  "Experience",
  "Academic/Learning",
] as const;

type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

interface InterviewQuestion {
  category: QuestionCategory;
  question: string;
}

interface InterviewAnswer {
  question: string;
  category: QuestionCategory;
  answer: string;
  score: number; // 1-10
  feedback: string;
}

interface JobDescription {
  filename: string;
  title: string;
  company: string;
  content: string;
  skills: string[];
}

interface SimulationResult {
  job: JobDescription;
  answers: InterviewAnswer[];
  overallScore: number;
  passStatus: "PASS" | "FAIL";
  recommendation: string;
  timestamp: string;
}

// Retry logic
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  requestFactory: () => Promise<Response>,
  retries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await requestFactory();
      if (response.ok || attempt === retries) return response;
      if ([429, 500, 502, 503, 504].includes(response.status)) {
        const waitTime = 3000 * attempt; // Wait longer on rate limits
        console.log(`  Retry ${attempt}/${retries} after ${response.status}, waiting ${waitTime / 1000}s...`);
        await sleep(waitTime);
        continue;
      }
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`  Retry ${attempt}/${retries} after network error...`);
      await sleep(3000 * attempt);
    }
  }
  throw new Error("Request failed after retries");
}

// Parse job description from markdown
function parseJobDescription(filename: string, content: string): JobDescription {
  const lines = content.split("\n");
  let title = "";
  let company = "";
  const skills: string[] = [];

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Extract company
  const companyMatch = content.match(/\*\*Company:\*\*\s*(.+)/i);
  if (companyMatch) {
    company = companyMatch[1].trim();
  }

  // Extract skills from Required Skills section
  const skillsSection = content.match(/## Required Skills[\s\S]*?(?=##|$)/i);
  if (skillsSection) {
    const skillMatches = skillsSection[0].matchAll(/^-\s+(.+)/gm);
    for (const match of skillMatches) {
      skills.push(match[1].trim());
    }
  }

  return {
    filename,
    title: title || filename.replace(/\.md$/, ""),
    company: company || "Unknown Company",
    content,
    skills,
  };
}

// Generate interview questions using LLM
async function generateQuestions(job: JobDescription): Promise<InterviewQuestion[]> {
  const prompt = `Generate ${QUESTIONS_PER_CATEGORY} interview questions for EACH of these 5 categories for a ${job.title} position at ${job.company}.

Categories:
1. HR/Behavioral - Questions about work style, teamwork, conflict resolution
2. Technical - Questions about specific skills: ${job.skills.slice(0, 5).join(", ")}
3. Team/Culture - Questions about collaboration, communication, company fit
4. Experience - Questions about past projects and achievements
5. Academic/Learning - Questions about education, continuous learning, certifications

Return ONLY a JSON array of objects with "category" and "question" fields. No markdown, no explanation.
Example: [{"category": "Technical", "question": "Explain your experience with React..."}, ...]`;

  const response = await fetchWithRetry(() =>
    fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })
  );

  if (!response.ok) {
    throw new Error(`Failed to generate questions: ${response.status}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content || "[]";

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Failed to parse questions JSON:", content);
    return getDefaultQuestions(job);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("JSON parse error:", content);
    return getDefaultQuestions(job);
  }
}

function getDefaultQuestions(job: JobDescription): InterviewQuestion[] {
  return [
    { category: "HR/Behavioral", question: "Tell me about yourself and why you're interested in this role." },
    { category: "HR/Behavioral", question: "Describe a challenging situation at work and how you handled it." },
    { category: "Technical", question: `What is your experience with ${job.skills[0] || "the required technologies"}?` },
    { category: "Technical", question: "Describe a technical problem you solved recently." },
    { category: "Team/Culture", question: "How do you prefer to collaborate with team members?" },
    { category: "Team/Culture", question: "Tell me about a time you had a disagreement with a colleague." },
    { category: "Experience", question: "Walk me through your most impactful project." },
    { category: "Experience", question: "What achievements are you most proud of?" },
    { category: "Academic/Learning", question: "How do you stay updated with new technologies?" },
    { category: "Academic/Learning", question: "Tell me about your educational background." },
  ];
}

// Get answer from Digital Twin (RAG)
async function getDigitalTwinAnswer(question: string): Promise<string> {
  // Search profile for relevant context
  const results = await searchProfile({ query: question, topK: 6 });
  const context = formatProfileResultsAsContext(results);

  const ownerName = process.env.OWNER_NAME || "Digital Twin";
  const systemPrompt = `You are ${ownerName}'s Digital Twin — an AI that represents them in job interviews.
Speak in first person ("I am...", "My experience...").
Answer based ONLY on the provided profile context.
Be professional, confident, and authentic.
If the context doesn't contain relevant information, provide a thoughtful response based on general professional experience.`;

  const response = await fetchWithRetry(() =>
    fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "system", content: `Profile Context:\n\n${context}` },
          { role: "user", content: question },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })
  );

  if (!response.ok) {
    throw new Error(`Failed to get answer: ${response.status}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content || "I apologize, I need more context to answer that question.";
}

// Evaluate answer using LLM
async function evaluateAnswer(
  question: string,
  answer: string,
  job: JobDescription
): Promise<{ score: number; feedback: string }> {
  const prompt = `Evaluate this interview answer for a ${job.title} position at ${job.company}.

Question: ${question}

Answer: ${answer}

Rate the answer from 1-10 and provide brief feedback. Consider:
- Relevance to the question
- Specificity and examples
- Professional communication
- Alignment with job requirements

Return ONLY a JSON object: {"score": <number 1-10>, "feedback": "<brief feedback>"}`;

  const response = await fetchWithRetry(() =>
    fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      }),
    })
  );

  if (!response.ok) {
    return { score: 5, feedback: "Unable to evaluate answer." };
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content || "{}";

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.min(10, Math.max(1, parsed.score || 5)),
        feedback: parsed.feedback || "No feedback provided.",
      };
    } catch {
      return { score: 5, feedback: "Parse error in evaluation." };
    }
  }

  return { score: 5, feedback: "Unable to parse evaluation." };
}

// Generate final recommendation
function generateRecommendation(result: SimulationResult): string {
  const { overallScore, passStatus, job, answers } = result;

  const categoryScores = new Map<QuestionCategory, number[]>();
  for (const answer of answers) {
    const scores = categoryScores.get(answer.category) || [];
    scores.push(answer.score);
    categoryScores.set(answer.category, scores);
  }

  const categoryAvgs = Array.from(categoryScores.entries()).map(([cat, scores]) => ({
    category: cat,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  const strengths = categoryAvgs.filter((c) => c.avg >= 7).map((c) => c.category);
  const improvements = categoryAvgs.filter((c) => c.avg < 6).map((c) => c.category);

  let rec = `## Hiring Recommendation: ${passStatus}\n\n`;
  rec += `**Overall Score:** ${overallScore.toFixed(1)}/10\n\n`;

  if (passStatus === "PASS") {
    rec += `The candidate demonstrates strong qualifications for the ${job.title} role at ${job.company}. `;
    if (strengths.length > 0) {
      rec += `Particularly strong performance in: ${strengths.join(", ")}. `;
    }
    rec += `\n\nRecommend proceeding to the next interview round.`;
  } else {
    rec += `The candidate shows potential but may need further evaluation for the ${job.title} role. `;
    if (improvements.length > 0) {
      rec += `Areas for improvement: ${improvements.join(", ")}. `;
    }
    rec += `\n\nConsider additional screening or alternative positions.`;
  }

  return rec;
}

// Format simulation result as markdown
function formatResultAsMarkdown(result: SimulationResult): string {
  const lines: string[] = [];

  lines.push(`# Interview Simulation Results`);
  lines.push(``);
  lines.push(`**Job:** ${result.job.title}`);
  lines.push(`**Company:** ${result.job.company}`);
  lines.push(`**Date:** ${result.timestamp}`);
  lines.push(`**Status:** ${result.passStatus}`);
  lines.push(`**Overall Score:** ${result.overallScore.toFixed(1)}/10`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Group by category
  const byCategory = new Map<QuestionCategory, InterviewAnswer[]>();
  for (const answer of result.answers) {
    const arr = byCategory.get(answer.category) || [];
    arr.push(answer);
    byCategory.set(answer.category, arr);
  }

  for (const category of QUESTION_CATEGORIES) {
    const categoryAnswers = byCategory.get(category);
    if (!categoryAnswers) continue;

    const avgScore =
      categoryAnswers.reduce((sum, a) => sum + a.score, 0) / categoryAnswers.length;

    lines.push(`## ${category} (Avg: ${avgScore.toFixed(1)}/10)`);
    lines.push(``);

    for (let i = 0; i < categoryAnswers.length; i++) {
      const a = categoryAnswers[i];
      lines.push(`### Q${i + 1}: ${a.question}`);
      lines.push(``);
      lines.push(`**Answer:**`);
      lines.push(a.answer);
      lines.push(``);
      lines.push(`**Score:** ${a.score}/10`);
      lines.push(`**Feedback:** ${a.feedback}`);
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(result.recommendation);

  return lines.join("\n");
}

// Main simulation runner
async function runSimulation(job: JobDescription): Promise<SimulationResult> {
  console.log(`\n📋 Generating questions for ${job.title}...`);
  const questions = await generateQuestions(job);

  const answers: InterviewAnswer[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`  [${i + 1}/${questions.length}] ${q.category}: ${q.question.slice(0, 50)}...`);

    // Get Digital Twin's answer
    const answer = await getDigitalTwinAnswer(q.question);
    await sleep(2000); // Rate limiting - increased delay

    // Evaluate the answer
    const evaluation = await evaluateAnswer(q.question, answer, job);
    await sleep(2000); // Rate limiting - increased delay

    answers.push({
      question: q.question,
      category: q.category,
      answer,
      score: evaluation.score,
      feedback: evaluation.feedback,
    });
  }

  const overallScore =
    answers.reduce((sum, a) => sum + a.score, 0) / answers.length;
  const passStatus = overallScore >= 6 ? "PASS" : "FAIL";

  const result: SimulationResult = {
    job,
    answers,
    overallScore,
    passStatus,
    recommendation: "",
    timestamp: new Date().toISOString(),
  };

  result.recommendation = generateRecommendation(result);

  return result;
}

// Main entry point
async function main() {
  console.log("🎯 Interview Simulation Script");
  console.log("==============================\n");

  // Check environment
  if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY environment variable is required");
    process.exit(1);
  }

  if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
    console.error("❌ UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN are required");
    process.exit(1);
  }

  // Read job descriptions
  const jobsDir = path.join(process.cwd(), "jobs");
  const interviewDir = path.join(process.cwd(), "interview");

  if (!fs.existsSync(jobsDir)) {
    console.error("❌ jobs/ directory not found");
    process.exit(1);
  }

  // Create interview output directory
  if (!fs.existsSync(interviewDir)) {
    fs.mkdirSync(interviewDir, { recursive: true });
  }

  const jobFiles = fs
    .readdirSync(jobsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  console.log(`📁 Found ${jobFiles.length} job descriptions\n`);

  const allResults: SimulationResult[] = [];

  for (const jobFile of jobFiles) {
    const content = fs.readFileSync(path.join(jobsDir, jobFile), "utf-8");
    const job = parseJobDescription(jobFile, content);

    console.log(`\n🏢 ${job.company} - ${job.title}`);
    console.log(`   Skills: ${job.skills.slice(0, 3).join(", ")}...`);

    const result = await runSimulation(job);
    allResults.push(result);

    // Write individual result file
    const resultFilename = jobFile.replace(".md", "-result.md");
    const resultPath = path.join(interviewDir, resultFilename);
    fs.writeFileSync(resultPath, formatResultAsMarkdown(result));
    console.log(`   ✅ Saved: interview/${resultFilename}`);
    console.log(`   📊 Score: ${result.overallScore.toFixed(1)}/10 - ${result.passStatus}`);
  }

  // Generate summary file
  const summary = generateSummary(allResults);
  fs.writeFileSync(path.join(interviewDir, "SUMMARY.md"), summary);
  console.log(`\n📝 Generated interview/SUMMARY.md`);

  // Calculate overall stats
  const passCount = allResults.filter((r) => r.passStatus === "PASS").length;
  const avgScore =
    allResults.reduce((sum, r) => sum + r.overallScore, 0) / allResults.length;

  console.log(`\n========================================`);
  console.log(`📊 Final Results:`);
  console.log(`   Total Simulations: ${allResults.length}`);
  console.log(`   Pass Rate: ${passCount}/${allResults.length} (${((passCount / allResults.length) * 100).toFixed(0)}%)`);
  console.log(`   Average Score: ${avgScore.toFixed(1)}/10`);
  console.log(`========================================\n`);
}

function generateSummary(results: SimulationResult[]): string {
  const lines: string[] = [];

  lines.push(`# Interview Simulation Summary`);
  lines.push(``);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Total Simulations:** ${results.length}`);
  lines.push(``);

  const passCount = results.filter((r) => r.passStatus === "PASS").length;
  const avgScore =
    results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;

  lines.push(`## Overall Statistics`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Pass Rate | ${passCount}/${results.length} (${((passCount / results.length) * 100).toFixed(0)}%) |`);
  lines.push(`| Average Score | ${avgScore.toFixed(1)}/10 |`);
  lines.push(`| Passing Threshold | 6.0/10 |`);
  lines.push(``);

  lines.push(`## Results by Position`);
  lines.push(``);
  lines.push(`| Company | Position | Score | Status |`);
  lines.push(`|---------|----------|-------|--------|`);

  for (const result of results) {
    lines.push(
      `| ${result.job.company} | ${result.job.title} | ${result.overallScore.toFixed(1)}/10 | ${result.passStatus} |`
    );
  }

  lines.push(``);
  lines.push(`## Category Analysis`);
  lines.push(``);

  // Aggregate scores by category
  const categoryScores = new Map<QuestionCategory, number[]>();
  for (const result of results) {
    for (const answer of result.answers) {
      const scores = categoryScores.get(answer.category) || [];
      scores.push(answer.score);
      categoryScores.set(answer.category, scores);
    }
  }

  lines.push(`| Category | Average Score | Questions |`);
  lines.push(`|----------|---------------|-----------|`);

  for (const category of QUESTION_CATEGORIES) {
    const scores = categoryScores.get(category) || [];
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    lines.push(`| ${category} | ${avg.toFixed(1)}/10 | ${scores.length} |`);
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`*See individual result files for detailed Q&A and feedback.*`);

  return lines.join("\n");
}

main().catch((error) => {
  console.error("❌ Simulation failed:", error);
  process.exit(1);
});
