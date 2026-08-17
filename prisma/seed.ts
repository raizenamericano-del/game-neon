import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

async function main() {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }

  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@neondash.local";
  const adminPass = process.env.ADMIN_PASSWORD || "changeme-admin";

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
    console.log(`Seeded admin account: ${adminEmail}`);
  }

  console.log(`Seeded ${ACHIEVEMENTS.length} achievements.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
