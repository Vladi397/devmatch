import { Router, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../lib/prisma";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

async function runGemini(prompt: string, attempt = 0): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err: any) {
    const is503 = err?.message?.includes("503") || err?.status === 503;
    if (is503 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
      return runGemini(prompt, attempt + 1);
    }
    throw err;
  }
}

router.post("/generate", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const { title, company, jobDescription, applicationId } = req.body;

    // Resolve job description: from stored application or from request body
    let resolvedDescription = jobDescription?.trim() ?? "";
    if (!resolvedDescription && applicationId) {
      const app = await prisma.application.findFirst({
        where: { id: applicationId, userId: req.userId },
        select: { description: true },
      });
      resolvedDescription = app?.description?.trim() ?? "";
    }

    if (!resolvedDescription) {
      return res.status(400).json({ message: "No job description available. Please try again." });
    }

    const resume = await prisma.resume.findFirst({
      where: { userId: req.userId },
      orderBy: { uploadedAt: "desc" },
      select: { content: true },
    });

    if (!resume?.content) {
      return res.status(404).json({ message: "No resume found. Please upload your resume first." });
    }

    const prompt = `
You are an expert career coach and professional writer. Write a compelling, personalized cover letter for this job application.

Candidate Resume:
${resume.content}

Job Title: ${title || "the position"}
Company: ${company || "the company"}
Job Description:
${resolvedDescription}

Write a 3-4 paragraph cover letter that:
- Opens with a strong, specific hook mentioning the role and company by name
- Highlights the 2-3 most relevant experiences from the resume that match the job
- Shows genuine enthusiasm for the company and role
- Closes confidently with a call to action

Write naturally and professionally. Do NOT use generic phrases like "I am writing to express my interest". Sound like a real person.
Respond with ONLY the cover letter text — no subject line, no JSON, no markdown.
    `.trim();

    const letter = await runGemini(prompt);
    res.json({ letter });
  } catch (error: any) {
    console.error("Motivation letter error:", error);
    const is503 = error?.message?.includes("503");
    res.status(500).json({
      message: is503
        ? "Gemini AI is busy right now. Please wait a moment and try again."
        : "Failed to generate letter. Please try again.",
    });
  }
});

router.post("/refine", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const { currentLetter, instruction, title, company, jobDescription } = req.body;

    if (!currentLetter?.trim()) {
      return res.status(400).json({ message: "currentLetter is required" });
    }
    if (!instruction?.trim()) {
      return res.status(400).json({ message: "instruction is required" });
    }

    const prompt = `
You are an expert career coach. Rewrite the cover letter below based on the user's specific instruction. Keep the job context and all specific examples — only apply the requested change. Maintain a professional, natural tone.

Job Title: ${title || "the position"}
Company: ${company || "the company"}
${jobDescription ? `Job Description:\n${jobDescription}` : ""}

Current Cover Letter:
${currentLetter}

User's Instruction: ${instruction}

Respond with ONLY the refined cover letter text — no subject line, no JSON, no markdown, no preamble.
    `.trim();

    const letter = await runGemini(prompt);
    res.json({ letter });
  } catch (error: any) {
    console.error("Motivation refine error:", error);
    res.status(500).json({ message: "Failed to refine letter", detail: error?.message });
  }
});

export default router;
