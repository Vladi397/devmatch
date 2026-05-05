import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import resumeRoutes from "./routes/resume";
import atsRoutes from "./routes/ats";
import jobsRoutes from "./routes/jobs";
import applicationsRoutes from "./routes/applications";
import motivationRoutes from "./routes/motivation";
import interviewRoutes from "./routes/interview";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/resume", resumeRoutes);
app.use("/ats", atsRoutes);
app.use("/jobs", jobsRoutes);
app.use("/applications", applicationsRoutes);
app.use("/motivation", motivationRoutes);
app.use("/interview", interviewRoutes);

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.get("/gemini-test", async (_, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.json({ ok: false, error: "GEMINI_API_KEY not set" });
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent("Say hello in 3 words.");
    res.json({ ok: true, response: result.response.text().trim() });
  } catch (err: any) {
    res.json({ ok: false, error: err?.message ?? "Unknown error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));