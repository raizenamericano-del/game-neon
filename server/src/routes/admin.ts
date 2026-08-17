import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/stats", async (_req: AuthedRequest, res, next) => {
  try {
    const [users, scores, customs, onlineHint] = await Promise.all([
      prisma.user.count(),
      prisma.score.count(),
      prisma.customLevel.count(),
      prisma.user.count({ where: { updatedAt: { gte: new Date(Date.now() - 1000 * 60 * 60) } } }),
    ]);
    const top = await prisma.user.findMany({
      orderBy: { totalStars: "desc" },
      take: 5,
      select: { username: true, totalStars: true, levelsBeaten: true },
    });
    res.json({ users, scores, customs, recentlyActive: onlineHint, top });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/users", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        totalStars: true,
        createdAt: true,
      },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});
