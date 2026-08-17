import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { optionalAuth, type AuthedRequest } from "../middleware/auth.js";

export const achievementsRouter = Router();

achievementsRouter.get("/", optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const all = await prisma.achievement.findMany({ orderBy: { id: "asc" } });
    let unlocked = new Set<string>();
    if (req.user) {
      const mine = await prisma.userAchievement.findMany({ where: { userId: req.user.sub } });
      unlocked = new Set(mine.map((m) => m.achievementId));
    }
    res.json({
      achievements: all.map((a) => ({ ...a, unlocked: unlocked.has(a.id) })),
    });
  } catch (err) {
    next(err);
  }
});
