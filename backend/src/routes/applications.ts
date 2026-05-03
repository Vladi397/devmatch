import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

const VALID_STATUSES = ["pending", "applied", "interview", "rejected"];

// Save a job (upsert — saving twice doesn't duplicate)
router.post("/", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const { externalId, title, company, location, remote, salary, url, source, tags, postedAt, description } = req.body;
    if (!externalId || !title || !company || !url) {
      return res.status(400).json({ message: "externalId, title, company and url are required" });
    }

    const application = await prisma.application.upsert({
      where: { userId_externalId: { userId: req.userId, externalId } },
      update: { description: description ?? null },
      create: {
        userId: req.userId,
        externalId,
        title,
        company,
        location: location ?? "",
        remote: remote ?? false,
        salary: salary ?? null,
        url,
        source: source ?? "adzuna",
        tags: JSON.stringify(tags ?? []),
        postedAt: postedAt ?? new Date().toISOString(),
        description: description ?? null,
        status: "pending",
      },
    });

    res.json({ application });
  } catch (error: any) {
    console.error("Save application error:", error);
    res.status(500).json({ message: "Failed to save application", detail: error?.message });
  }
});

// List applications, optionally filtered by status
router.get("/", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = { userId: req.userId };
    if (status && VALID_STATUSES.includes(status as string)) where.status = status;

    const applications = await prisma.application.findMany({
      where,
      orderBy: { savedAt: "desc" },
    });

    // Parse tags back to array and build counts
    const parsed = applications.map((a) => ({
      ...a,
      tags: (() => { try { return JSON.parse(a.tags); } catch { return []; } })(),
    }));

    const counts = {
      all: await prisma.application.count({ where: { userId: req.userId } }),
      pending: await prisma.application.count({ where: { userId: req.userId, status: "pending" } }),
      applied: await prisma.application.count({ where: { userId: req.userId, status: "applied" } }),
      interview: await prisma.application.count({ where: { userId: req.userId, status: "interview" } }),
      rejected: await prisma.application.count({ where: { userId: req.userId, status: "rejected" } }),
    };

    res.json({ applications: parsed, counts });
  } catch (error: any) {
    console.error("List applications error:", error);
    res.status(500).json({ message: "Failed to fetch applications", detail: error?.message });
  }
});

// Get saved job IDs (for marking saved state in Jobs tab)
router.get("/ids", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const apps = await prisma.application.findMany({
      where: { userId: req.userId },
      select: { externalId: true },
    });
    res.json({ ids: apps.map((a) => a.externalId) });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch saved ids", detail: error?.message });
  }
});

// Update status
router.patch("/:id/status", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const application = await prisma.application.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { status },
    });

    if (application.count === 0) return res.status(404).json({ message: "Application not found" });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Failed to update status", detail: error?.message });
  }
});

// Delete by internal id
router.delete("/:id", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    await prisma.application.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete application error:", error);
    res.status(500).json({ message: "Failed to delete application", detail: error?.message });
  }
});

// Delete by externalId (used from Jobs tab to unsave)
router.delete("/external/:externalId", protect, async (req: AuthRequest | any, res: Response) => {
  try {
    await prisma.application.deleteMany({
      where: { externalId: req.params.externalId, userId: req.userId },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to unsave job", detail: error?.message });
  }
});

export default router;
