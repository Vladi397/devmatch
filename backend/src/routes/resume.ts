import { Router, Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { protect, AuthRequest } from "../middleware/auth";

const pdfParseRaw = require("pdf-parse");
const pdfParse = typeof pdfParseRaw === "function" ? pdfParseRaw : pdfParseRaw.default;

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", protect, upload.single("resume"), async (req: AuthRequest | any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;
    const fileName = req.file.originalname || "resume.pdf";

    const resume = await prisma.resume.create({
      data: {
        userId,
        fileUrl: fileName,
        content: extractedText,
      },
    });

    res.status(201).json({ message: "Resume uploaded successfully", resume });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error processing resume" });
  }
});

router.get("/latest", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const userId = req.userId;
    const resume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, fileUrl: true, content: true, uploadedAt: true },
    });

    if (!resume) return res.status(404).json({ message: "No resume found" });

    res.json({ resume });
  } catch (error) {
    console.error("Fetch resume error:", error);
    res.status(500).json({ message: "Error fetching resume" });
  }
});

export default router;
