import dotenv from "dotenv"
import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

import { Index } from "@upstash/vector"

// Profile interfaces based on data/profile.json structure
interface Location {
  city: string
  state: string
  country: string
  timezone: string
}

interface WorkRights {
  status: string
  visaType: string
  requiresSponsorship: boolean
}

interface Availability {
  status: string
  noticePeriod: string
  preferredWorkType: string[]
  remotePreference: string
}

interface PersonalInfo {
  fullName: string
  preferredName: string
  title: string
  headline: string
  location: Location
  workRights: WorkRights
  availability: Availability
}

interface ProfessionalSummary {
  elevator_pitch: string
  unique_value_proposition: string
  years_of_experience: number
  career_focus: string[]
}

interface SkillCategory {
  category: string
  proficiency: string
  tools?: string[]
  methodologies?: string[]
  deliverables?: string[]
  techniques?: string[]
  languages?: string[]
  frameworks?: string[]
}

interface Skills {
  software_development: SkillCategory
  business_analytics: SkillCategory
  technical: SkillCategory
  soft_skills: string[]
}

interface Achievement {
  metric: string
  improvement: string
  context: string
}

interface Experience {
  id: string
  company: string
  role: string
  type: string
  duration: { start: string; end: string }
  location: string
  description: string
  responsibilities: string[]
  achievements: Achievement[]
  technologies: string[]
  keywords: string[]
}

interface Education {
  institution: string
  degree: string
  major: string
  graduation_year: number
  relevant_coursework: string[]
}

interface Certification {
  name: string
  issuer: string
  year: number
  credential_id: string
}

interface Project {
  id: string
  name: string
  type: string
  description: string
  role: string
  duration: string
  outcomes: string[]
  skills_used: string[]
}

interface InterviewQA {
  question: string
  answer: string
}

interface Preferences {
  role_interests: string[]
  industry_interests: string[]
  company_culture: string[]
  deal_breakers: string[]
}

interface Contact {
  email: string
  linkedin: string
  portfolio: string
  github: string
}

interface Profile {
  metadata: { version: string; lastUpdated: string; dataOwner: string }
  personalInfo: PersonalInfo
  professionalSummary: ProfessionalSummary
  skills: Skills
  experience: Experience[]
  education: Education[]
  certifications: Certification[]
  projects: Project[]
  interview_qa: {
    strengths: InterviewQA[]
    experience_based: InterviewQA[]
    technical: InterviewQA[]
  }
  preferences: Preferences
  contact: Contact
}

interface ProfileChunk {
  id: string
  data: string
  metadata: Record<string, unknown>
}

const REQUIRED_ENV_VARS = ["UPSTASH_VECTOR_REST_URL", "UPSTASH_VECTOR_REST_TOKEN"] as const
type RequiredEnv = (typeof REQUIRED_ENV_VARS)[number]

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({
  path: path.resolve(__dirname, "../.env.local"),
  override: false,
})

const PROFILE_PATH = path.resolve(__dirname, "../data/profile.json")

function ensureEnv(): Record<RequiredEnv, string> {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`)
  }
  return {
    UPSTASH_VECTOR_REST_URL: process.env.UPSTASH_VECTOR_REST_URL!,
    UPSTASH_VECTOR_REST_TOKEN: process.env.UPSTASH_VECTOR_REST_TOKEN!,
  }
}

async function loadProfile(): Promise<Profile> {
  const contents = await readFile(PROFILE_PATH, "utf-8")
  return JSON.parse(contents) as Profile
}

function chunkProfile(profile: Profile): ProfileChunk[] {
  const chunks: ProfileChunk[] = []
  const ownerName = profile.personalInfo.fullName

  // 1. Personal Info & Summary chunk
  chunks.push({
    id: "profile-summary",
    data: `
${ownerName} - ${profile.personalInfo.title}
${profile.personalInfo.headline}

Location: ${profile.personalInfo.location.city}, ${profile.personalInfo.location.state}, ${profile.personalInfo.location.country}
Work Status: ${profile.personalInfo.workRights.status} (${profile.personalInfo.workRights.visaType})
Availability: ${profile.personalInfo.availability.status}, ${profile.personalInfo.availability.noticePeriod} notice period
Preferred Work: ${profile.personalInfo.availability.preferredWorkType.join(", ")} - ${profile.personalInfo.availability.remotePreference}

Elevator Pitch: ${profile.professionalSummary.elevator_pitch}

Unique Value: ${profile.professionalSummary.unique_value_proposition}

Years of Experience: ${profile.professionalSummary.years_of_experience}
Career Focus: ${profile.professionalSummary.career_focus.join(", ")}
    `.trim(),
    metadata: {
      type: "summary",
      section: "personal_info",
      owner: ownerName,
    },
  })

  // 2. Skills chunks (one per category)
  const skillCategories = ["software_development", "business_analytics", "technical"] as const
  for (const category of skillCategories) {
    const skill = profile.skills[category]
    const parts = [
      `${ownerName}'s ${category.replace("_", " ")} skills:`,
      `Proficiency: ${skill.proficiency}`,
    ]
    if (skill.tools) parts.push(`Tools: ${skill.tools.join(", ")}`)
    if (skill.languages) parts.push(`Languages: ${skill.languages.join(", ")}`)
    if (skill.frameworks) parts.push(`Frameworks: ${skill.frameworks.join(", ")}`)
    if (skill.methodologies) parts.push(`Methodologies: ${skill.methodologies.join(", ")}`)
    if (skill.techniques) parts.push(`Techniques: ${skill.techniques.join(", ")}`)
    if (skill.deliverables) parts.push(`Deliverables: ${skill.deliverables.join(", ")}`)

    chunks.push({
      id: `skill-${category}`,
      data: parts.join("\n"),
      metadata: {
        type: "skill",
        category,
        proficiency: skill.proficiency,
        owner: ownerName,
      },
    })
  }

  // Soft skills
  chunks.push({
    id: "skill-soft",
    data: `${ownerName}'s soft skills: ${profile.skills.soft_skills.join(", ")}`,
    metadata: {
      type: "skill",
      category: "soft_skills",
      owner: ownerName,
    },
  })

  // 3. Experience chunks (one per role)
  for (const exp of profile.experience) {
    const achievementLines = exp.achievements
      .map((a) => `- ${a.metric}: ${a.improvement} (${a.context})`)
      .join("\n")

    chunks.push({
      id: exp.id,
      data: `
${ownerName}'s experience at ${exp.company}:
Role: ${exp.role} (${exp.type})
Duration: ${exp.duration.start} to ${exp.duration.end}
Location: ${exp.location}

${exp.description}

Responsibilities:
${exp.responsibilities.map((r) => `- ${r}`).join("\n")}

Key Achievements:
${achievementLines}

Technologies used: ${exp.technologies.join(", ")}
      `.trim(),
      metadata: {
        type: "experience",
        company: exp.company,
        role: exp.role,
        duration_start: exp.duration.start,
        duration_end: exp.duration.end,
        technologies: exp.technologies,
        keywords: exp.keywords,
        owner: ownerName,
      },
    })
  }

  // 4. Education chunks
  for (let i = 0; i < profile.education.length; i++) {
    const edu = profile.education[i]
    chunks.push({
      id: `edu-${i + 1}`,
      data: `
${ownerName}'s education:
${edu.degree} in ${edu.major}
${edu.institution}
Graduation: ${edu.graduation_year}
Relevant Coursework: ${edu.relevant_coursework.join(", ")}
      `.trim(),
      metadata: {
        type: "education",
        institution: edu.institution,
        degree: edu.degree,
        graduation_year: edu.graduation_year,
        owner: ownerName,
      },
    })
  }

  // 5. Certifications chunk
  if (profile.certifications.length > 0) {
    const certLines = profile.certifications
      .map((c) => `- ${c.name} by ${c.issuer} (${c.year})`)
      .join("\n")
    chunks.push({
      id: "certifications",
      data: `${ownerName}'s certifications:\n${certLines}`,
      metadata: {
        type: "certification",
        certifications: profile.certifications.map((c) => c.name),
        owner: ownerName,
      },
    })
  }

  // 6. Projects chunks (one per project)
  for (const proj of profile.projects) {
    chunks.push({
      id: proj.id,
      data: `
${ownerName}'s project: ${proj.name}
Type: ${proj.type}
Role: ${proj.role}
Duration: ${proj.duration}

${proj.description}

Outcomes:
${proj.outcomes.map((o) => `- ${o}`).join("\n")}

Skills used: ${proj.skills_used.join(", ")}
      `.trim(),
      metadata: {
        type: "project",
        project_name: proj.name,
        project_type: proj.type,
        skills: proj.skills_used,
        owner: ownerName,
      },
    })
  }

  // 7. Interview Q&A chunks (one per question)
  const qaCategories = ["strengths", "experience_based", "technical"] as const
  for (const category of qaCategories) {
    const questions = profile.interview_qa[category]
    for (let i = 0; i < questions.length; i++) {
      const qa = questions[i]
      chunks.push({
        id: `qa-${category}-${i + 1}`,
        data: `
Interview Question: ${qa.question}

${ownerName}'s Answer: ${qa.answer}
        `.trim(),
        metadata: {
          type: "interview_qa",
          category,
          question: qa.question,
          owner: ownerName,
        },
      })
    }
  }

  // 8. Preferences chunk
  chunks.push({
    id: "preferences",
    data: `
${ownerName}'s career preferences:

Role Interests: ${profile.preferences.role_interests.join(", ")}
Industry Interests: ${profile.preferences.industry_interests.join(", ")}
Ideal Company Culture: ${profile.preferences.company_culture.join(", ")}
Deal Breakers: ${profile.preferences.deal_breakers.join(", ")}
    `.trim(),
    metadata: {
      type: "preferences",
      role_interests: profile.preferences.role_interests,
      industry_interests: profile.preferences.industry_interests,
      owner: ownerName,
    },
  })

  // 9. Contact info chunk
  chunks.push({
    id: "contact",
    data: `
${ownerName}'s contact information:
Email: ${profile.contact.email}
LinkedIn: ${profile.contact.linkedin}
Portfolio: ${profile.contact.portfolio}
GitHub: ${profile.contact.github}
    `.trim(),
    metadata: {
      type: "contact",
      owner: ownerName,
    },
  })

  return chunks
}

async function upsertProfile() {
  const env = ensureEnv()
  const profile = await loadProfile()
  const chunks = chunkProfile(profile)

  console.log(`\nParsed profile for: ${profile.personalInfo.fullName}`)
  console.log(`Generated ${chunks.length} chunks for embedding\n`)

  const index = new Index({
    url: env.UPSTASH_VECTOR_REST_URL,
    token: env.UPSTASH_VECTOR_REST_TOKEN,
  })

  let successCount = 0
  let failureCount = 0

  for (const chunk of chunks) {
    try {
      await index.upsert({
        id: chunk.id,
        data: chunk.data,
        metadata: chunk.metadata,
      })
      successCount += 1
      console.log(`✓ Upserted ${chunk.id} (${chunk.metadata.type})`)
    } catch (error) {
      failureCount += 1
      console.error(`✗ Failed to upsert ${chunk.id}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`\n${"─".repeat(50)}`)
  console.log(`Profile upload complete.`)
  console.log(`✓ ${successCount} chunks succeeded`)
  if (failureCount > 0) {
    console.log(`✗ ${failureCount} chunks failed`)
    process.exitCode = 1
  }
  console.log(`${"─".repeat(50)}\n`)
}

upsertProfile().catch((error) => {
  console.error("Unexpected error while uploading profile:", error instanceof Error ? error.message : error)
  process.exit(1)
})
