import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import resumeRoutes from "./routes/resume"; // <-- 1. Import the resume routes

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/resume", resumeRoutes); // <-- 2. Tell Express to use the resume routes

app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));