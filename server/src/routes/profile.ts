import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { OFFICIAL_LEVELS } from "../data/official.js";

export const profileRouter = Router();

profileRouter.get("/:username", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      include: {
        progress: { orderBy: { updatedAt: "desc" } },
        achievements: { include: { achievement: true }, orderBy: { unlockedAt: "desc" } },
        customLevels: { where: { published: true }, orderBy: { createdAt: "desc" }, take: 12 },
      },
    });
    if (!user) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const rank =
      (await prisma.user.count({
        where: {
          OR: [
            { totalStars: { gt: user.totalStars } },
            { totalStars: user.totalStars, levelsBeaten: { gt: user.levelsBeaten } },
          ],
        },
      })) + 1;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        totalStars: user.totalStars,
        totalAttempts: user.totalAttempts,
        totalJumps: user.totalJumps,
        totalDeaths: user.totalDeaths,
        levelsBeaten: user.levelsBeaten,
        favoriteLevel: user.favoriteLevel,
        avatarColor: user.avatarColor,
        bio: user.bio,
        country: user.country,
        createdAt: user.createdAt,
        rank,
      },
      progress: user.progress.map((p) => ({
        ...p,
        level: OFFICIAL_LEVELS.find((l) => l.id === p.levelId) || null,
      })),
      achievements: user.achievements,
      customLevels: user.customLevels.map((l) => ({
        id: l.id,
        name: l.name,
        difficulty: l.difficulty,
        plays: l.plays,
        likes: l.likes,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});
