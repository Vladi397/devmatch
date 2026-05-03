import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import resumeRoutes from "./routes/resume";
import atsRoutes from "./routes/ats";
import jobsRoutes from "./routes/jobs";
import applicationsRoutes from "./routes/applications";
import motivationRoutes from "./routes/motivation";

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

app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));