import { Router, Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
// 1. Import 'protect' and 'AuthRequest' from your actual middleware
import { protect, AuthRequest } from "../middleware/auth";

// 2. Use require for pdf-parse to bypass the TypeScript typing error
const pdfParse = require("pdf-parse");

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 3. Use the 'protect' middleware here
router.post("/upload", protect, upload.single("resume"), async (req: AuthRequest | any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // 4. Use req.userId which is populated by your protect middleware
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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