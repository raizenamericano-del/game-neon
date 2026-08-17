import { execFile } from "child_process";
import { promisify } from "util";
import bcrypt from "bcryptjs";
import { prisma, hasDatabase } from "./prisma.js";

const execFileAsync = promisify(execFile);

const ACHIEVEMENTS = [
  { id: "first-blood", name: "First Blood", description: "Die for the first time. Welcome to the grind.", icon: "💀", category: "play", requirement: 1 },
  { id: "first-clear", name: "First Light", description: "Complete any official level.", icon: "⭐", category: "progress", requirement: 1 },
  { id: "star-collector", name: "Star Collector", description: "Earn 10 stars.", icon: "✨", category: "progress", requirement: 10 },
  { id: "constellation", name: "Constellation", description: "Earn 30 stars.", icon: "🌟", category: "progress", requirement: 30 },
  { id: "attempt-100", name: "Persistent", description: "Reach 100 total attempts.", icon: "🔁", category: "play", requirement: 100 },
  { id: "attempt-1000", name: "Masochist", description: "Reach 1,000 total attempts.", icon: "🔥", category: "play", requirement: 1000 },
  { id: "jump-500", name: "Hopper", description: "Jump 500 times.", icon: "🦘", category: "play", requirement: 500 },
  { id: "all-forms", name: "Shapeshifter", description: "Play as Cube, Ship, Ball, Wave and UFO.", icon: "🧬", category: "play", requirement: 5 },
  { id: "practice-pro", name: "Lab Rat", description: "Finish a level in practice mode.", icon: "🧪", category: "play", requirement: 1 },
  { id: "speedrun", name: "Speed Demon", description: "Beat a level in under 30 seconds.", icon: "⚡", category: "skill", requirement: 1 },
  { id: "no-practice", name: "One Take", description: "Beat a hard level without practice mode.", icon: "🎯", category: "skill", requirement: 1 },
  { id: "daily", name: "Clockwork", description: "Complete a daily challenge.", icon: "📅", category: "social", requirement: 1 },
  { id: "publisher", name: "Architect", description: "Publish a custom level.", icon: "🏗️", category: "social", requirement: 1 },
  { id: "liked", name: "Crowd Favorite", description: "Receive 5 likes on a custom level.", icon: "💜", category: "social", requirement: 5 },
  { id: "top-10", name: "Podium Bound", description: "Reach top 10 on any official leaderboard.", icon: "🏆", category: "skill", requirement: 1 },
  { id: "perfect", name: "Flawless", description: "Collect every coin in a level and finish.", icon: "💎", category: "skill", requirement: 1 },
  { id: "all-official", name: "Neon God", description: "Beat every official level.", icon: "👑", category: "progress", requirement: 10 },
];

async function migrateIfPossible() {
  if (!hasDatabase) {
    console.log("[db] no remote DATABASE_URL — skip migrate");
    return;
  }
  try {
    console.log("[db] running prisma migrate deploy…");
    const { stdout, stderr } = await execFileAsync(
      "npx",
      ["prisma", "migrate", "deploy"],
      { timeout: 60_000, env: process.env as NodeJS.ProcessEnv }
    );
    if (stdout) console.log(stdout.trim());
    if (stderr) console.warn(stderr.trim());
  } catch (err) {
    console.warn("[db] migrate skipped:", (err as Error).message);
  }
}

export async function seedOnBoot() {
  try {
    await migrateIfPossible();
    if (!hasDatabase) return;

    await prisma.$queryRaw`SELECT 1`;
    const count = await prisma.achievement.count();
    if (count < ACHIEVEMENTS.length) {
      for (const a of ACHIEVEMENTS) {
        await prisma.achievement.upsert({ where: { id: a.id }, update: a, create: a });
      }
      console.log(`[seed] achievements ready (${ACHIEVEMENTS.length})`);
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASSWORD;
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    if (adminEmail && adminPass) {
      const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (!existing) {
        await prisma.user.create({
          data: {
            username: adminUser,
            email: adminEmail,
            passwordHash: await bcrypt.hash(adminPass, 12),
            role: "admin",
            avatarColor: "#ff2bd6",
            bio: "System administrator",
          },
        });
        console.log(`[seed] admin ${adminEmail}`);
      }
    }
  } catch (err) {
    console.warn("[seed] skipped:", (err as Error).message);
  }
}
