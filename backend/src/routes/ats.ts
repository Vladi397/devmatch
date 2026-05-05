import { Router, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../lib/prisma";
import { protect, AuthRequest } from "../middleware/auth";
const PDFDocument = require("pdfkit");

const router = Router();

async function runGemini(prompt: string, attempt = 0): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    try {
      return JSON.parse(text);
    } catch {
      const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      return JSON.parse(cleaned);
    }
  } catch (err: any) {
    const is503 = err?.message?.includes("503") || err?.status === 503;
    if (is503 && attempt < 4) {
      const delay = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s
      await new Promise((r) => setTimeout(r, delay));
      return runGemini(prompt, attempt + 1);
    }
    throw err;
  }
}

function buildScanPrompt(content: string) {
  return `
You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the resume below and evaluate how well it would perform when parsed by an ATS system. Respond with ONLY valid JSON — no markdown, no code blocks, just raw JSON.

Resume:
${content}

Analyze for:
- Clear section headers (Experience, Education, Skills, etc.)
- Use of strong action verbs
- Quantifiable achievements (numbers, percentages, results)
- Relevant technical keywords and skills
- Overall formatting and structure quality
- Contact information completeness

Respond with this exact JSON structure:
{
  "score": <number 0-100>,
  "summary": "<2-3 sentence overview of the resume's ATS readiness>",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": ["specific actionable suggestion1", "suggestion2", "suggestion3"],
  "keywords": ["detected keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}
  `.trim();
}

function resumeDataToText(d: any): string {
  const lines: string[] = [];
  if (d.name) lines.push(d.name);
  const c = d.contact || {};
  const contactLine = [c.email, c.phone, c.location, c.linkedin].filter(Boolean).join(" | ");
  if (contactLine) lines.push(contactLine);
  if (d.summary) { lines.push("\nSUMMARY"); lines.push(d.summary); }
  if (d.experience?.length) {
    lines.push("\nEXPERIENCE");
    for (const job of d.experience) {
      lines.push(`${[job.title, job.company].filter(Boolean).join(" — ")}`);
      const meta = [job.duration, job.location].filter(Boolean).join(" | ");
      if (meta) lines.push(meta);
      for (const b of (job.bullets || [])) lines.push(`• ${b}`);
    }
  }
  if (d.education?.length) {
    lines.push("\nEDUCATION");
    for (const edu of d.education) {
      lines.push(`${[edu.degree, edu.school].filter(Boolean).join(" — ")}`);
      if (edu.duration) lines.push(edu.duration);
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
    }
  }
  if (d.skills?.length) { lines.push("\nSKILLS"); lines.push(d.skills.join(", ")); }
  return lines.join("\n");
}

// Scan the resume itself for ATS compatibility (no job description needed)
router.post("/scan", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { userId: req.userId },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, content: true },
    });

    if (!resume?.content) {
      return res.status(404).json({ message: "No resume found. Please upload your resume first." });
    }

    const analysis = await runGemini(buildScanPrompt(resume.content));
    res.json({ analysis });
  } catch (error: any) {
    console.error("ATS scan error:", error);
    res.status(500).json({ message: "Scan failed", detail: error?.message });
  }
});

// Compare resume against a job description
router.post("/analyze", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription?.trim()) {
      return res.status(400).json({ message: "Job description is required" });
    }

    const resume = await prisma.resume.findFirst({
      where: { userId: req.userId },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, content: true },
    });

    if (!resume?.content) {
      return res.status(404).json({ message: "No resume found. Please upload your resume first." });
    }

    const prompt = `
You are an ATS (Applicant Tracking System) analyzer. Compare the resume below against the job description and respond with ONLY valid JSON — no markdown, no code blocks, just raw JSON.

Resume:
${resume.content}

Job Description:
${jobDescription}

Respond with this exact JSON structure:
{
  "score": <number 0-100>,
  "summary": "<2 sentence summary of the match>",
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}
    `.trim();

    const analysis = await runGemini(prompt);
    res.json({ analysis });
  } catch (error: any) {
    console.error("ATS analyze error:", error);
    res.status(500).json({ message: "Analysis failed", detail: error?.message });
  }
});

// Step 1 — Gemini rewrites the resume and returns structured JSON + list of improvements
router.post("/improve", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { userId: req.userId },
      orderBy: { uploadedAt: "desc" },
      select: { content: true },
    });

    if (!resume?.content) {
      return res.status(404).json({ message: "No resume found. Please upload your resume first." });
    }

    const prompt = `
You are an expert resume writer and ATS optimization specialist. Rewrite the resume below to be more ATS-friendly and impactful. Keep ALL the same facts, companies, dates, and qualifications — only improve the wording, add relevant keywords, strengthen action verbs, and add quantifiable results where reasonable.

Resume text:
${resume.content}

Respond with ONLY valid JSON — no markdown, no code blocks:
{
  "name": "Full Name",
  "contact": {
    "email": "...",
    "phone": "...",
    "location": "...",
    "linkedin": "..."
  },
  "summary": "Improved 2-3 sentence professional summary with keywords",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Month Year – Month Year",
      "location": "City, Country",
      "bullets": ["Strong action verb + what you did + measurable result", "..."]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "school": "School Name",
      "duration": "Year – Year",
      "gpa": "if mentioned"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "improvements": [
    "Short description of each key improvement made (max 6 items)"
  ]
}
    `.trim();

    const analysis = await runGemini(prompt);
    res.json({ improvements: analysis.improvements, resumeData: analysis });
  } catch (error: any) {
    console.error("Improve error:", error);
    res.status(500).json({ message: "Failed to improve resume", detail: error?.message });
  }
});

// Step 2 — Generate a clean ATS-optimised PDF from the improved resume data
router.post("/generate-pdf", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const { resumeData } = req.body;
    if (!resumeData) return res.status(400).json({ message: "resumeData is required" });

    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: "Improved Resume" } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="improved-resume.pdf"`);
    doc.pipe(res);

    const W = doc.page.width - 100;
    const L = 50;

    const rule = (heavy = false) => {
      doc.moveDown(0.2)
        .moveTo(L, doc.y).lineTo(L + W, doc.y)
        .strokeColor(heavy ? "#333333" : "#cccccc")
        .lineWidth(heavy ? 1 : 0.5).stroke()
        .moveDown(0.4);
    };

    const section = (title: string) => {
      doc.moveDown(0.6)
        .font("Helvetica-Bold").fontSize(10).fillColor("#111111")
        .text(title.toUpperCase(), L, doc.y, { characterSpacing: 1.2, width: W });
      rule();
    };

    // ── Name ──
    doc.font("Helvetica-Bold").fontSize(22).fillColor("#111111")
      .text(resumeData.name || "Name", { align: "center" });

    // ── Contact line ──
    const c = resumeData.contact || {};
    const contactLine = [c.email, c.phone, c.location, c.linkedin].filter(Boolean).join("   ·   ");
    if (contactLine) {
      doc.font("Helvetica").fontSize(9).fillColor("#555555")
        .text(contactLine, L, doc.y, { align: "center", width: W });
    }
    doc.moveDown(0.4);
    rule(true);

    // ── Summary ──
    if (resumeData.summary) {
      section("Summary");
      doc.font("Helvetica").fontSize(10).fillColor("#333333")
        .text(resumeData.summary, L, doc.y, { width: W, align: "justify" });
    }

    // ── Experience ──
    if (resumeData.experience?.length) {
      section("Experience");
      for (const job of resumeData.experience) {
        const header = [job.title, job.company].filter(Boolean).join(" — ");
        const meta = [job.duration, job.location].filter(Boolean).join("   ·   ");
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text(header, L, doc.y, { width: W });
        if (meta) doc.font("Helvetica").fontSize(9).fillColor("#666666").text(meta, L, doc.y, { width: W });
        if (job.bullets?.length) {
          doc.moveDown(0.15);
          for (const b of job.bullets) {
            doc.font("Helvetica").fontSize(9.5).fillColor("#333333")
              .text(`•  ${b}`, L + 10, doc.y, { width: W - 10 });
          }
        }
        doc.moveDown(0.5);
      }
    }

    // ── Education ──
    if (resumeData.education?.length) {
      section("Education");
      for (const edu of resumeData.education) {
        const header = [edu.degree, edu.school].filter(Boolean).join(" — ");
        const meta = [edu.duration, edu.gpa ? `GPA: ${edu.gpa}` : ""].filter(Boolean).join("   ·   ");
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text(header, L, doc.y, { width: W });
        if (meta) doc.font("Helvetica").fontSize(9).fillColor("#666666").text(meta, L, doc.y, { width: W });
        doc.moveDown(0.5);
      }
    }

    // ── Skills ──
    if (resumeData.skills?.length) {
      section("Skills");
      doc.font("Helvetica").fontSize(10).fillColor("#333333")
        .text(resumeData.skills.join("   •   "), L, doc.y, { width: W });
    }

    doc.end();
  } catch (error: any) {
    console.error("Generate PDF error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate PDF", detail: error?.message });
    }
  }
});

// Save the improved resume directly to DB and re-scan it (no re-upload needed)
router.post("/save-improved", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const { resumeData } = req.body;
    if (!resumeData) return res.status(400).json({ message: "resumeData is required" });

    const content = resumeDataToText(resumeData);

    const resume = await prisma.resume.create({
      data: { userId: req.userId, fileUrl: "devmatch-improved.pdf", content },
    });

    const analysis = await runGemini(buildScanPrompt(content));
    res.json({ resume, analysis });
  } catch (error: any) {
    console.error("Save improved error:", error);
    res.status(500).json({ message: "Failed to save improved resume", detail: error?.message });
  }
});

export default router;
