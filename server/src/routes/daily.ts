import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { OFFICIAL_LEVELS } from "../data/official.js";

export const dailyRouter = Router();

function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function hashSeed(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

dailyRouter.get("/", async (_req, res, next) => {
  try {
    const key = dateKey();
    let row = await prisma.dailyChallenge.findUnique({ where: { dateKey: key } });
    if (!row) {
      const seed = hashSeed(key);
      const level = OFFICIAL_LEVELS[seed % OFFICIAL_LEVELS.length];
      row = await prisma.dailyChallenge.create({
        data: { dateKey: key, seed, levelId: `daily-${key}` },
      });
      void level;
    }
    const seed = row.seed;
    const base = OFFICIAL_LEVELS[seed % OFFICIAL_LEVELS.length];
    res.json({
      date: key,
      seed,
      levelId: row.levelId,
      name: `Daily · ${key}`,
      basedOn: base,
      endsInMs: new Date(key + "T23:59:59.999Z").getTime() - Date.now(),
    });
  } catch (err) {
    next(err);
  }
});
