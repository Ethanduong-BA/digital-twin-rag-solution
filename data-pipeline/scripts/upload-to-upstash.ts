import { Index } from "@upstash/vector";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

const currentDir = process.cwd();
dotenv.config({ path: path.resolve(currentDir, "../.env") });

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

async function uploadData() {
  try {
    const dataPath = path.resolve(currentDir, "raw_data/profile.json");
    const profile = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    console.log("🚀 Creating 45+ vectors from profile data...");

    const vectors: Array<{
      id: string;
      data: string;
      metadata: Record<string, any>;
    }> = [];

    let vectorId = 1;

    // 1. Personal Info Vector
    vectors.push({
      id: `ethan-personal-${vectorId++}`,
      data: `Name: ${profile.personal_info.name}, Role: ${profile.personal_info.role}, Location: ${profile.personal_info.location}, Email: ${profile.personal_info.contact.email}, Status: Available for Freelance`,
      metadata: {
        type: "personal_info",
        name: profile.personal_info.name,
        role: profile.personal_info.role,
      },
    });

    // 2. Career Objective
    vectors.push({
      id: `ethan-objective-${vectorId++}`,
      data: profile.personal_info.career_objective,
      metadata: {
        type: "career_objective",
        skills_focus: ["Design", "Data Analysis", "Business Analytics"],
      },
    });

    // 3. Education Vectors
    profile.education.forEach((edu: any, idx: number) => {
      vectors.push({
        id: `ethan-education-${vectorId++}`,
        data: `${edu.degree} from ${edu.institution}, ${edu.duration}`,
        metadata: {
          type: "education",
          degree: edu.degree,
          institution: edu.institution,
        },
      });
    });

    // 4-6. Experience Vectors (3 experience entries)
    profile.experience.forEach((exp: any, idx: number) => {
      vectors.push({
        id: `ethan-experience-${vectorId++}`,
        data: `${exp.position} at ${exp.company} (${exp.duration}). ${exp.star_points.join(" ")}`,
        metadata: {
          type: "experience",
          position: exp.position,
          company: exp.company,
        },
      });
    });

    // 7-10. Technical Skills Vectors
    const skillsKeys = Object.keys(profile.technical_skills);
    skillsKeys.forEach((skillCategory: string) => {
      const skills = profile.technical_skills[skillCategory];
      vectors.push({
        id: `ethan-skills-${vectorId++}`,
        data: `${skillCategory}: ${Array.isArray(skills) ? skills.join(", ") : skills}`,
        metadata: {
          type: "technical_skills",
          category: skillCategory,
        },
      });
    });

    // 11-19. Projects Vectors (9 projects from Behance)
    profile.projects_detailed.forEach((project: any, idx: number) => {
      vectors.push({
        id: `ethan-project-${vectorId++}`,
        data: `Project: ${project.name}. Client: ${project.client}. Description: ${project.description}. Technologies: ${project.technologies.join(", ")}. Views: ${project.metrics.views}, Appreciations: ${project.metrics.appreciations}`,
        metadata: {
          type: "project",
          name: project.name,
          technologies: project.technologies,
        },
      });
    });

    // 20-24. Project Metrics Vectors
    profile.projects_detailed.forEach((project: any, idx: number) => {
      vectors.push({
        id: `ethan-project-metrics-${vectorId++}`,
        data: `${project.name} by Khoa Duong has ${project.metrics.views} views, ${project.metrics.appreciations} appreciations, built with ${project.technologies.slice(0, 2).join(", ")}`,
        metadata: {
          type: "project_metrics",
          project_name: project.name,
          views: project.metrics.views,
          appreciations: project.metrics.appreciations,
        },
      });
    });

    // 25-29. Certifications Vectors
    profile.certifications.forEach((cert: any, idx: number) => {
      vectors.push({
        id: `ethan-certification-${vectorId++}`,
        data: `${cert.name} from ${cert.issuer}${cert.year ? ` (${cert.year})` : `(${cert.status}, Expected: ${cert.expected_completion})`}. ${cert.description || ""}`,
        metadata: {
          type: "certification",
          name: cert.name,
          issuer: cert.issuer,
        },
      });
    });

    // 30-33. Skills Summary Vectors (by category)
    vectors.push({
      id: `ethan-skills-summary-${vectorId++}`,
      data: `Data Analysis Skills: Python, Power BI, Excel, SQL, Predictive Modeling, Data Visualization, Statistical Analysis`,
      metadata: { type: "skills_summary", domain: "data_analysis" },
    });

    vectors.push({
      id: `ethan-skills-summary-${vectorId++}`,
      data: `UX/UI Design Skills: Figma, Adobe XD, Illustrator, Photoshop, Prototyping, User Research, Usability Testing, Accessibility, Interaction Design, Design Systems`,
      metadata: { type: "skills_summary", domain: "ux_ui" },
    });

    vectors.push({
      id: `ethan-skills-summary-${vectorId++}`,
      data: `Business Analysis Skills: Requirements Analysis, Stakeholder Communication, Project Management, User Journey Mapping, Competitive Analysis, A/B Testing`,
      metadata: { type: "skills_summary", domain: "business_analysis" },
    });

    vectors.push({
      id: `ethan-skills-summary-${vectorId++}`,
      data: `Languages: English (Fluent - Professional), Vietnamese (Native)`,
      metadata: { type: "skills_summary", domain: "languages" },
    });

    // 34-37. Experience Summary Vectors
    profile.experience.forEach((exp: any, idx: number) => {
      vectors.push({
        id: `ethan-exp-summary-${vectorId++}`,
        data: `Khoa Duong worked at ${exp.company} as ${exp.position} from ${exp.duration}`,
        metadata: {
          type: "experience_summary",
          company: exp.company,
          role: exp.position,
        },
      });
    });

    // 38-40. Key Achievements Vectors
    profile.experience.forEach((exp: any, idx: number) => {
      if (exp.key_achievements) {
        vectors.push({
          id: `ethan-achievements-${vectorId++}`,
          data: `At ${exp.company} as ${exp.position}: ${exp.key_achievements.join(". ")}`,
          metadata: {
            type: "achievements",
            company: exp.company,
          },
        });
      }
    });

    // 41-43. Technology Stack Vectors
    const allTechs = new Set<string>();
    profile.projects_detailed.forEach((p: any) => {
      p.technologies.forEach((t: string) => allTechs.add(t));
    });

    const techArray = Array.from(allTechs);
    vectors.push({
      id: `ethan-tech-stack-${vectorId++}`,
      data: `Technologies used: ${techArray.slice(0, 15).join(", ")}`,
      metadata: { type: "tech_stack", count: techArray.length },
    });

    vectors.push({
      id: `ethan-design-tools-${vectorId++}`,
      data: `Design Tools: Figma (Advanced), Adobe Creative Suite (XD, Illustrator, Photoshop), Design Systems, Component Architecture`,
      metadata: { type: "design_tools" },
    });

    vectors.push({
      id: `ethan-ba-tools-${vectorId++}`,
      data: `Business Analysis Tools: Jira, Asana, Notion, Miro, Google Analytics, Power BI, SQL`,
      metadata: { type: "ba_tools" },
    });

    // 44-45. Portfolio Summary Vectors
    vectors.push({
      id: `ethan-portfolio-${vectorId++}`,
      data: `Portfolio includes 9 projects with ${profile.projects_detailed.reduce((sum: number, p: any) => sum + p.metrics.views, 0)} total views. Featured projects: Heineken Website, eKYC, Queue System.`,
      metadata: { type: "portfolio_summary" },
    });

    vectors.push({
      id: `ethan-full-profile-${vectorId++}`,
      data: JSON.stringify(profile),
      metadata: {
        type: "full_profile",
        created_at: new Date().toISOString(),
        total_vectors: vectorId - 1,
      },
    });

    console.log(`📊 Upserting ${vectors.length} vectors to Upstash...`);

    // Upsert in batches (Upstash has limits)
    const batchSize = 50;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} uploaded (${batch.length} vectors)`);
    }

    console.log(
      `\n🎉 Success! ${vectors.length}+ vectors synced to Upstash Vector DB!`
    );
    console.log(`Vector breakdown: Personal (2) + Education (2) + Experience (3) + Skills (4) + Projects (9) + Metrics (9) + Certifications (5) + Summaries (11)`);
  } catch (error) {
    console.error("❌ Upload failed:", error);
    process.exit(1);
  }
}

uploadData();