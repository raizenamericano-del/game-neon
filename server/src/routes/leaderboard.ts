import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { OFFICIAL_LEVELS } from "../data/official.js";
import { optionalAuth, type AuthedRequest } from "../middleware/auth.js";

export const leaderboardRouter = Router();

leaderboardRouter.get("/global", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ totalStars: "desc" }, { levelsBeaten: "desc" }, { createdAt: "asc" }],
      take: 50,
      select: {
        id: true,
        username: true,
        totalStars: true,
        levelsBeaten: true,
        totalAttempts: true,
        avatarColor: true,
        createdAt: true,
      },
    });
    res.json({
      entries: users.map((u, i) => ({ rank: i + 1, ...u })),
    });
  } catch (err) {
    next(err);
  }
});

leaderboardRouter.get("/:levelId", optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { levelId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    const best = await prisma.levelProgress.findMany({
      where: { levelId, completed: true },
      orderBy: [{ bestTimeMs: "asc" }, { attempts: "asc" }],
      take: limit,
      include: {
        user: { select: { id: true, username: true, avatarColor: true } },
      },
    });

    const recent = await prisma.score.findMany({
      where: { levelId },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { id: true, username: true, avatarColor: true } } },
    });

    let me = null;
    if (req.user) {
      const mine = await prisma.levelProgress.findUnique({
        where: { userId_levelId: { userId: req.user.sub, levelId } },
      });
      if (mine) {
        const better = await prisma.levelProgress.count({
          where: {
            levelId,
            completed: true,
            OR: [
              { bestTimeMs: { lt: mine.bestTimeMs ?? 1e12 } },
              { bestTimeMs: mine.bestTimeMs ?? undefined, attempts: { lt: mine.attempts } },
            ],
          },
        });
        me = { ...mine, rank: mine.completed ? better + 1 : null };
      }
    }

    res.json({
      level: OFFICIAL_LEVELS.find((l) => l.id === levelId) || { id: levelId },
      entries: best.map((row, i) => ({
        rank: i + 1,
        userId: row.user.id,
        username: row.user.username,
        avatarColor: row.user.avatarColor,
        percentage: row.bestPercentage,
        timeMs: row.bestTimeMs,
        attempts: row.attempts,
        stars: row.stars,
        coins: row.coins,
      })),
      recent: recent.map((s) => ({
        username: s.user.username,
        avatarColor: s.user.avatarColor,
        percentage: s.percentage,
        timeMs: s.timeMs,
        createdAt: s.createdAt,
      })),
      me,
    });
  } catch (err) {
    next(err);
  }
});
