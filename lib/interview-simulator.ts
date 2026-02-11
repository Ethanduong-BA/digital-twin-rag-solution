/**
 * Interview Simulator
 * 
 * Runs simulated interviews against job descriptions using the Digital Twin.
 * Generates questions across categories, gets answers from the RAG system,
 * and evaluates the responses.
 */

import { searchProfile, formatProfileResultsAsContext } from "./profile-search";

// ---------- Types ----------

export interface InterviewQuestion {
  category: "HR" | "Technical" | "Team" | "Experience" | "Academic";
  question: string;
  answer: string;
  evaluation: string;
  score: number;
}

export interface InterviewSimulationResult {
  jobTitle: string;
  company: string;
  questions: InterviewQuestion[];
  score: number;
  passed: boolean;
  recommendation: string;
}

export interface JobDescription {
  title: string;
  company: string;
  source: string;
  requiredSkills: string[];
  responsibilities: string[];
  qualifications?: string[];
}

// ---------- Question Templates by Category ----------

const QUESTION_TEMPLATES: Record<InterviewQuestion["category"], string[]> = {
  HR: [
    "Tell me about yourself and why you're interested in this role.",
    "What are your salary expectations?",
    "Why do you want to work at {company}?",
    "Where do you see yourself in 5 years?",
    "What motivates you in your work?",
  ],
  Technical: [
    "Describe your experience with {skill}.",
    "How would you approach building a {responsibility}?",
    "What's the most complex technical problem you've solved?",
    "How do you stay current with new technologies?",
    "Walk me through your development workflow.",
  ],
  Team: [
    "How do you handle disagreements with team members?",
    "Describe your experience working in cross-functional teams.",
    "How do you communicate technical concepts to non-technical stakeholders?",
    "Tell me about a time you mentored someone.",
    "How do you approach code reviews?",
  ],
  Experience: [
    "Tell me about your most recent role and responsibilities.",
    "What's your proudest professional achievement?",
    "Describe a challenging project you led.",
    "How did you handle a missed deadline or failed project?",
    "What would your previous manager say about you?",
  ],
  Academic: [
    "How has your education prepared you for this role?",
    "What relevant coursework have you completed?",
    "Tell me about any certifications you hold.",
    "How do you continue learning and developing skills?",
    "What academic projects are most relevant to this position?",
  ],
};

// ---------- Question Generation ----------

function generateQuestions(job: {
  jobTitle: string;
  company: string;
  requiredSkills: string[];
  responsibilities?: string[];
}): Array<{ category: InterviewQuestion["category"]; question: string }> {
  const questions: Array<{ category: InterviewQuestion["category"]; question: string }> = [];

  // Pick 1-2 questions per category
  const categories: InterviewQuestion["category"][] = ["HR", "Technical", "Team", "Experience", "Academic"];

  for (const category of categories) {
    const templates = QUESTION_TEMPLATES[category];
    const numQuestions = category === "Technical" ? 2 : 1;

    for (let i = 0; i < numQuestions && i < templates.length; i++) {
      let question = templates[i];

      // Replace placeholders
      question = question.replace("{company}", job.company);
      if (job.requiredSkills.length > 0) {
        const skill = job.requiredSkills[i % job.requiredSkills.length];
        question = question.replace("{skill}", skill);
      }
      if (job.responsibilities && job.responsibilities.length > 0) {
        const responsibility = job.responsibilities[i % job.responsibilities.length];
        question = question.replace("{responsibility}", responsibility);
      }

      questions.push({ category, question });
    }
  }

  return questions;
}

// ---------- Answer Generation ----------

async function generateAnswer(question: string): Promise<{ answer: string; context: string }> {
  // Search profile for relevant context
  const results = await searchProfile({ query: question, topK: 5 });

  if (results.length === 0) {
    return {
      answer: "I don't have specific information about that in my background, but I'm always eager to learn and adapt.",
      context: "",
    };
  }

  const context = formatProfileResultsAsContext(results);

  // Build a response based on the context
  // In production, this would call an LLM. For now, we use the profile data directly.
  const topResult = results[0];
  const relevantData = topResult.data ?? "";

  // Create a first-person answer from the context
  let answer = relevantData;

  // Add professionalism and structure
  if (!answer.startsWith("I ") && !answer.startsWith("My ")) {
    answer = "Based on my experience, " + answer.toLowerCase();
  }

  // Truncate if too long
  if (answer.length > 500) {
    answer = answer.slice(0, 497) + "...";
  }

  return { answer, context };
}

// ---------- Answer Evaluation ----------

function evaluateAnswer(
  question: string,
  answer: string,
  job: { requiredSkills: string[] }
): { evaluation: string; score: number } {
  let score = 70; // Base score
  const evaluationPoints: string[] = [];

  // Check if answer is substantive
  if (answer.length > 100) {
    score += 5;
    evaluationPoints.push("Detailed response");
  }

  // Check for skill mentions
  const answerLower = answer.toLowerCase();
  let skillMatches = 0;
  for (const skill of job.requiredSkills) {
    if (answerLower.includes(skill.toLowerCase())) {
      skillMatches++;
    }
  }
  if (skillMatches > 0) {
    score += skillMatches * 5;
    evaluationPoints.push(`Mentioned ${skillMatches} relevant skill(s)`);
  }

  // Check for metrics/achievements
  if (/\d+%|\d+\+|\$\d+/.test(answer)) {
    score += 10;
    evaluationPoints.push("Quantified achievements");
  }

  // Check for specific examples
  if (answer.includes("project") || answer.includes("experience") || answer.includes("worked")) {
    score += 5;
    evaluationPoints.push("Provided specific examples");
  }

  // Cap score at 100
  score = Math.min(score, 100);

  const evaluation =
    evaluationPoints.length > 0
      ? evaluationPoints.join("; ")
      : "Adequate response";

  return { evaluation, score };
}

// ---------- Main Simulation Function ----------

export async function runInterviewSimulation(job: {
  jobTitle: string;
  company: string;
  requiredSkills: string[];
  responsibilities?: string[];
}): Promise<InterviewSimulationResult> {
  const questionTemplates = generateQuestions(job);
  const questions: InterviewQuestion[] = [];

  for (const qt of questionTemplates) {
    const { answer } = await generateAnswer(qt.question);
    const { evaluation, score } = evaluateAnswer(qt.question, answer, job);

    questions.push({
      category: qt.category,
      question: qt.question,
      answer,
      evaluation,
      score,
    });
  }

  // Calculate overall score
  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
  const averageScore = Math.round(totalScore / questions.length);

  // Determine pass/fail (threshold: 70%)
  const passed = averageScore >= 70;

  // Generate recommendation
  let recommendation: string;
  if (averageScore >= 85) {
    recommendation = `**Strong Hire**: The candidate demonstrates excellent qualifications for the ${job.jobTitle} role at ${job.company}. Technical skills and experience align well with requirements.`;
  } else if (averageScore >= 70) {
    recommendation = `**Hire with Reservations**: The candidate shows good potential for the ${job.jobTitle} role. Some areas may benefit from additional training or mentorship.`;
  } else if (averageScore >= 55) {
    recommendation = `**Consider for Different Role**: While the candidate has valuable skills, there may be a better fit within ${job.company}. Consider alternative positions.`;
  } else {
    recommendation = `**Do Not Hire**: The candidate's profile does not sufficiently match the requirements for ${job.jobTitle} at ${job.company}.`;
  }

  return {
    jobTitle: job.jobTitle,
    company: job.company,
    questions,
    score: averageScore,
    passed,
    recommendation,
  };
}

// ---------- Batch Simulation ----------

export async function runBatchInterviewSimulation(
  jobs: JobDescription[]
): Promise<InterviewSimulationResult[]> {
  const results: InterviewSimulationResult[] = [];

  for (const job of jobs) {
    const result = await runInterviewSimulation({
      jobTitle: job.title,
      company: job.company,
      requiredSkills: job.requiredSkills,
      responsibilities: job.responsibilities,
    });
    results.push(result);
  }

  return results;
}
