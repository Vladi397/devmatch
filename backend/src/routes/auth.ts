import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return res.status(409).json({ message: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid)
    return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.post("/change-password", protect, async (req: AuthRequest | any, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Current and new password are required" });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ message: "User not found" });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Current password is incorrect" });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });

  res.json({ message: "Password updated successfully" });
});

router.patch("/profile", protect, async (req: AuthRequest | any, res: Response) => {
  const { name } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { name },
  });
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

export default router;