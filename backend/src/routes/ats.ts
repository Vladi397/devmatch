import { Router, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../lib/prisma";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

async function runGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned);
  }
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

    const prompt = `
You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the resume below and evaluate how well it would perform when parsed by an ATS system. Respond with ONLY valid JSON — no markdown, no code blocks, just raw JSON.

Resume:
${resume.content}

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

    const analysis = await runGemini(prompt);
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

export default router;
