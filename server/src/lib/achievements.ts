import { prisma } from "./prisma.js";
import { OFFICIAL_LEVELS } from "../data/official.js";

export async function evaluateAchievements(userId: string, context: {
  died?: boolean;
  completed?: boolean;
  stars?: number;
  attempts?: number;
  jumps?: number;
  timeMs?: number;
  practice?: boolean;
  coins?: number;
  maxCoins?: number;
  difficulty?: number;
  daily?: boolean;
  formsPlayed?: string[];
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { achievements: true, progress: true, scores: { take: 1, orderBy: { createdAt: "desc" } } },
  });
  if (!user) return [];

  const owned = new Set(user.achievements.map((a) => a.achievementId));
  const unlock: string[] = [];

  const grant = (id: string) => {
    if (!owned.has(id)) unlock.push(id);
  };

  if (context.died || user.totalDeaths >= 1) grant("first-blood");
  if (context.completed || user.levelsBeaten >= 1) grant("first-clear");
  if (user.totalStars >= 10) grant("star-collector");
  if (user.totalStars >= 30) grant("constellation");
  if (user.totalAttempts >= 100) grant("attempt-100");
  if (user.totalAttempts >= 1000) grant("attempt-1000");
  if (user.totalJumps >= 500) grant("jump-500");
  if (context.practice && context.completed) grant("practice-pro");
  if (context.completed && context.timeMs && context.timeMs < 30_000) grant("speedrun");
  if (context.completed && !context.practice && (context.difficulty || 0) >= 6) grant("no-practice");
  if (context.daily && context.completed) grant("daily");
  if (context.completed && (context.coins || 0) >= (context.maxCoins || 3) && (context.maxCoins || 0) > 0) {
    grant("perfect");
  }

  const beatenOfficial = user.progress.filter(
    (p) => p.completed && OFFICIAL_LEVELS.some((l) => l.id === p.levelId)
  ).length;
  if (beatenOfficial >= OFFICIAL_LEVELS.length) grant("all-official");

  if (unlock.length) {
    await prisma.userAchievement.createMany({
      data: unlock.map((achievementId) => ({ userId, achievementId })),
      skipDuplicates: true,
    });
  }

  return unlock;
}

export async function grantAchievement(userId: string, achievementId: string) {
  try {
    await prisma.userAchievement.create({ data: { userId, achievementId } });
    return true;
  } catch {
    return false;
  }
}
