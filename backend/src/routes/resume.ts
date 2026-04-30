import { Router, Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { protect, AuthRequest } from "../middleware/auth";

// --- BULLETPROOF PDF-PARSE IMPORT ---
const pdfParseRaw = require("pdf-parse");
// Automatically unwrap the function if TypeScript nested it inside a 'default' object
const pdfParse = typeof pdfParseRaw === "function" ? pdfParseRaw : pdfParseRaw.default;

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", protect, upload.single("resume"), async (req: AuthRequest | any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Pass the file buffer to the unwrapped parsing function
    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    const fileUrl = "local-storage-placeholder";

    const resume = await prisma.resume.create({
      data: {
        userId,
        fileUrl,
        content: extractedText,
      },
    });

    res.status(201).json({ message: "Resume uploaded successfully", resume });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error processing resume" });
  }
});

export default router;