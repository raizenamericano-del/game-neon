import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { config } from "../config.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const authRouter = Router();

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscore only"),
  email: z.string().email().max(120),
  password: z.string().min(6).max(72),
});

const loginSchema = z.object({
  login: z.string().min(1).max(120),
  password: z.string().min(1).max(72),
});

function setAuthCookie(res: import("express").Response, token: string) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: config.isProd ? "none" : "lax",
    secure: config.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function publicUser(u: {
  id: string;
  username: string;
  email: string;
  role: string;
  totalStars: number;
  totalAttempts: number;
  totalJumps: number;
  totalDeaths: number;
  levelsBeaten: number;
  favoriteLevel: string | null;
  avatarColor: string;
  bio: string;
  createdAt: Date;
}) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    totalStars: u.totalStars,
    totalAttempts: u.totalAttempts,
    totalJumps: u.totalJumps,
    totalDeaths: u.totalDeaths,
    levelsBeaten: u.levelsBeaten,
    favoriteLevel: u.favoriteLevel,
    avatarColor: u.avatarColor,
    bio: u.bio,
    createdAt: u.createdAt,
  };
}

authRouter.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password } = req.body as z.infer<typeof registerSchema>;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email: email.toLowerCase(), passwordHash },
    });
    const token = signToken({ sub: user.id, username: user.username, role: user.role });
    setAuthCookie(res, token);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { login, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: login.toLowerCase() }, { username: login }],
      },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ sub: user.id, username: user.username, role: user.role });
    setAuthCookie(res, token);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(config.cookieName, { path: "/" });
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

const profileSchema = z.object({
  bio: z.string().max(160).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  favoriteLevel: z.string().max(64).nullable().optional(),
  country: z.string().max(4).optional(),
});

authRouter.patch("/me", requireAuth, validate(profileSchema), async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: req.body,
    });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
