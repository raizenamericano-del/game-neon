import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { officialById } from "../data/official.js";
import { evaluateAchievements } from "../lib/achievements.js";
import { emitLeaderboard } from "../socket.js";

export const progressRouter = Router();

const submitSchema = z.object({
  levelId: z.string().min(1).max(64),
  percentage: z.number().min(0).max(100),
  attempts: z.number().int().min(1).max(1_000_000),
  jumps: z.number().int().min(0).max(1_000_000).default(0),
  timeMs: z.number().int().min(0).max(3_600_000),
  coins: z.number().int().min(0).max(3).default(0),
  died: z.boolean().default(false),
  completed: z.boolean().default(false),
  practice: z.boolean().default(false),
  replayData: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        r: z.number(),
        f: z.string(),
      })
    )
    .max(4000)
    .optional(),
});

progressRouter.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const rows = await prisma.levelProgress.findMany({
      where: { userId: req.user!.sub },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ progress: rows });
  } catch (err) {
    next(err);
  }
});

progressRouter.post("/", requireAuth, validate(submitSchema), async (req: AuthedRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof submitSchema>;
    const userId = req.user!.sub;
    const official = officialById(body.levelId);
    const awardStars = body.completed && !body.practice && official ? official.stars : 0;

    const existing = await prisma.levelProgress.findUnique({
      where: { userId_levelId: { userId, levelId: body.levelId } },
    });

    const isBetter =
      !existing ||
      body.percentage > existing.bestPercentage + 0.01 ||
      (body.completed && body.percentage >= existing.bestPercentage && body.timeMs < (existing.bestTimeMs || 1e12));

    const firstClear = body.completed && !existing?.completed;

    const progress = await prisma.levelProgress.upsert({
      where: { userId_levelId: { userId, levelId: body.levelId } },
      create: {
        userId,
        levelId: body.levelId,
        bestPercentage: body.percentage,
        bestTimeMs: body.completed ? body.timeMs : null,
        attempts: body.attempts,
        jumps: body.jumps,
        stars: awardStars,
        coins: body.coins,
        completed: body.completed,
        practiceUsed: body.practice,
        replayData: isBetter && body.replayData ? body.replayData : undefined,
        completedAt: body.completed ? new Date() : null,
      },
      update: {
        bestPercentage: { set: Math.max(existing?.bestPercentage || 0, body.percentage) },
        bestTimeMs:
          body.completed
            ? Math.min(existing?.bestTimeMs || body.timeMs, body.timeMs)
            : existing?.bestTimeMs,
        attempts: { increment: body.died || body.completed ? 1 : 0 },
        jumps: { increment: body.jumps },
        stars: awardStars > (existing?.stars || 0) ? awardStars : existing?.stars,
        coins: Math.max(existing?.coins || 0, body.coins),
        completed: existing?.completed || body.completed,
        practiceUsed: existing?.practiceUsed || body.practice,
        replayData: isBetter && body.replayData ? body.replayData : undefined,
        completedAt: firstClear ? new Date() : existing?.completedAt,
      },
    });

    const starDelta = firstClear ? awardStars : 0;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        totalAttempts: { increment: body.died || body.completed ? 1 : 0 },
        totalJumps: { increment: body.jumps },
        totalDeaths: { increment: body.died ? 1 : 0 },
        totalStars: { increment: starDelta },
        levelsBeaten: { increment: firstClear ? 1 : 0 },
      },
    });

    let score = null;
    if (body.completed && !body.practice) {
      score = await prisma.score.create({
        data: {
          userId,
          levelId: body.levelId,
          percentage: body.percentage,
          attempts: body.attempts,
          timeMs: body.timeMs,
          stars: awardStars,
          coins: body.coins,
        },
      });
      emitLeaderboard(body.levelId);
    }

    let unlocked: string[] = [];
    try {
      unlocked = await evaluateAchievements(userId, {
      died: body.died,
      completed: body.completed,
      stars: user.totalStars,
      attempts: user.totalAttempts,
      jumps: user.totalJumps,
      timeMs: body.timeMs,
      practice: body.practice,
      coins: body.coins,
      maxCoins: official?.coins,
      difficulty: official?.difficulty,
      daily: body.levelId.startsWith("daily-"),
    });
    } catch (e) {
      console.warn("achievement eval failed", e);
    }

    res.json({ progress, unlocked, starDelta, score });
  } catch (err) {
    next(err);
  }
});

progressRouter.get("/replay/:levelId", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { levelId } = req.params;
    const own = await prisma.levelProgress.findUnique({
      where: { userId_levelId: { userId: req.user!.sub, levelId } },
    });
    const best = await prisma.levelProgress.findFirst({
      where: { levelId, completed: true, replayData: { not: null } as never },
      orderBy: [{ bestTimeMs: "asc" }],
    });
    res.json({
      own: own?.replayData || null,
      ghost: best?.replayData || null,
    });
  } catch (err) {
    next(err);
  }
});
