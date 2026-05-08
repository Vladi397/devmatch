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

router.post("/social", async (req: Request, res: Response) => {
  const { provider, token, email, extra } = req.body;
  if (!provider || !token) {
    return res.status(400).json({ message: "Provider and token are required" });
  }

  let verifiedEmail = email as string;
  let verifiedName  = extra as string;

  try {
    if (provider === "google") {
      const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return res.status(401).json({ message: "Invalid Google token" });
      const u = await r.json() as { email: string; name?: string };
      verifiedEmail = u.email;
      verifiedName  = u.name ?? "";

    } else if (provider === "apple") {
      // iOS pre-verifies the identity token; trust the email for MVP.
      // For production, verify the JWT against Apple's public keys.
      verifiedEmail = email;
      verifiedName  = extra || email?.split("@")[0] || "User";

    } else if (provider === "linkedin") {
      // `token` is the authorization code; `extra` is the PKCE code_verifier.
      const params = new URLSearchParams({
        grant_type:    "authorization_code",
        code:          token,
        redirect_uri:  `${process.env.APP_SCHEME ?? "mobile"}://auth`,
        client_id:     process.env.LINKEDIN_CLIENT_ID    ?? "",
        client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
        code_verifier: extra,
      });
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    params.toString(),
      });
      if (!tokenRes.ok) return res.status(401).json({ message: "LinkedIn token exchange failed" });
      const tokenData = await tokenRes.json() as { access_token: string };

      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!profileRes.ok) return res.status(401).json({ message: "Failed to get LinkedIn profile" });
      const profile = await profileRes.json() as { email: string; name?: string };
      verifiedEmail = profile.email;
      verifiedName  = profile.name ?? "";

    } else {
      return res.status(400).json({ message: "Unknown provider" });
    }

    if (!verifiedEmail) {
      return res.status(401).json({ message: "Could not retrieve email from provider" });
    }

    let user = await prisma.user.findUnique({ where: { email: verifiedEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email:        verifiedEmail,
          passwordHash: await bcrypt.hash(Math.random().toString(36) + Date.now(), 10),
          name:         verifiedName || verifiedEmail.split("@")[0],
        },
      });
    }

    const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
    return res.json({ token: jwtToken, user: { id: user.id, email: user.email, name: user.name } });

  } catch (err) {
    console.error("Social auth error:", err);
    return res.status(500).json({ message: "Social authentication failed" });
  }
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