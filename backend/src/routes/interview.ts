import { Router, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../lib/prisma";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

async function runGemini(prompt: string, attempt = 0): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
      return runGemini(prompt, attempt + 1);
    }
    throw err;
  }
}

router.post("/questions", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const { title, company, jobDescription } = req.body;

    const resume = await prisma.resume.findFirst({
      where: { userId: req.userId },
      orderBy: { uploadedAt: "desc" },
      select: { content: true },
    });

    if (!resume?.content) {
      return res.status(404).json({ message: "No resume found. Please upload your resume first." });
    }

    const prompt = `
You are an expert technical recruiter and interview coach. Generate exactly 5 interview questions for the following position.

Job Title: ${title || "Software Developer"}
Company: ${company || "the company"}
${jobDescription ? `Job Description:\n${jobDescription}` : ""}

Candidate Resume:
${resume.content}

Create a balanced mix: 2 behavioral, 2 technical, 1 situational. Tailor the technical questions to the technologies and experience visible in the resume. Make the questions specific and realistic — not generic.

Respond with ONLY valid JSON — no markdown, no code blocks:
{
  "questions": [
    {
      "id": 1,
      "question": "Full question text",
      "type": "behavioral",
      "tip": "One-sentence STAR coaching tip specific to this question"
    },
    {
      "id": 2,
      "question": "Full question text",
      "type": "technical",
      "tip": "One-sentence tip on what to demonstrate technically"
    },
    {
      "id": 3,
      "question": "Full question text",
      "type": "situational",
      "tip": "One-sentence tip on how to frame the scenario"
    },
    {
      "id": 4,
      "question": "Full question text",
      "type": "behavioral",
      "tip": "One-sentence STAR coaching tip"
    },
    {
      "id": 5,
      "question": "Full question text",
      "type": "technical",
      "tip": "One-sentence tip on what to demonstrate technically"
    }
  ]
}
    `.trim();

    const data = await runGemini(prompt);
    res.json({ questions: data.questions });
  } catch (error: any) {
    console.error("Interview questions error:", error);
    const is503 = error?.message?.includes("503");
    res.status(500).json({
      message: is503
        ? "Gemini AI is busy right now. Please wait a moment and try again."
        : "Failed to generate questions. Please try again.",
    });
  }
});

router.post("/evaluate", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const { question, answer, jobTitle } = req.body;

    if (!question?.trim() || !answer?.trim() || !jobTitle?.trim()) {
      return res.status(400).json({ message: "question, answer, and jobTitle are required" });
    }

    const prompt = `
You are an expert interview coach evaluating a candidate's answer using the STAR method (Situation, Task, Action, Result).

Job Title: ${jobTitle}
Interview Question: ${question}
Candidate's Answer: ${answer}

Evaluate the answer honestly and constructively. Respond with ONLY valid JSON — no markdown, no code blocks:
{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentence overall feedback — be specific about what worked and what to improve>",
  "starBreakdown": {
    "situation": "<Did they set the context clearly? Start with Yes/Partial/No then one sentence>",
    "task": "<Did they describe their specific responsibility? Start with Yes/Partial/No then one sentence>",
    "action": "<Did they explain concrete steps they personally took? Start with Yes/Partial/No then one sentence>",
    "result": "<Did they state a quantified or clear outcome? Start with Yes/Partial/No then one sentence>"
  },
  "improvedAnswer": "<Rewrite the answer in perfect STAR format as if the candidate gave an ideal response — 150-200 words, first person, specific and confident>"
}

Score guide: 85-100 = strong STAR with clear result, 65-84 = good structure with minor gaps, 40-64 = partial STAR missing key elements, 0-39 = missing multiple major components.
    `.trim();

    const data = await runGemini(prompt);
    res.json(data);
  } catch (error: any) {
    console.error("Interview evaluate error:", error);
    const is503 = error?.message?.includes("503");
    res.status(500).json({
      message: is503
        ? "Gemini AI is busy right now. Please wait a moment and try again."
        : "Failed to evaluate answer. Please try again.",
    });
  }
});

export default router;
