import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { optionalAuth, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { grantAchievement } from "../lib/achievements.js";

export const customRouter = Router();

const objectSchema = z.object({
  t: z.enum(["spike", "block", "portal", "orb", "pad", "coin", "gravity", "speed", "saw", "pillar", "finish"]),
  x: z.number(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  rot: z.number().optional(),
  form: z.string().optional(),
  kind: z.string().optional(),
  mult: z.number().optional(),
});

const createSchema = z.object({
  name: z.string().min(2).max(32),
  description: z.string().max(200).default(""),
  difficulty: z.number().int().min(1).max(10),
  data: z.object({
    speed: z.number().min(6).max(24).default(10.4),
    length: z.number().min(40).max(2000),
    color: z
      .object({
        bg: z.string(),
        ground: z.string(),
        accent: z.string(),
        accent2: z.string().optional(),
      })
      .optional(),
    objects: z.array(objectSchema).min(1).max(800),
  }),
});

customRouter.get("/", optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    const sort = (req.query.sort as string) || "hot";
    const order =
      sort === "new"
        ? { createdAt: "desc" as const }
        : sort === "plays"
          ? { plays: "desc" as const }
          : { likes: "desc" as const };

    const levels = await prisma.customLevel.findMany({
      where: { published: true },
      orderBy: order,
      take: 40,
      include: { author: { select: { username: true, avatarColor: true } } },
    });

    let liked = new Set<string>();
    if (req.user) {
      const likes = await prisma.levelLike.findMany({
        where: { userId: req.user.sub, levelId: { in: levels.map((l) => l.id) } },
      });
      liked = new Set(likes.map((l) => l.levelId));
    }

    res.json({
      levels: levels.map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description,
        difficulty: l.difficulty,
        plays: l.plays,
        likes: l.likes,
        createdAt: l.createdAt,
        author: l.author,
        liked: liked.has(l.id),
        objectCount: Array.isArray((l.data as { objects?: unknown[] })?.objects)
          ? (l.data as { objects: unknown[] }).objects.length
          : 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

customRouter.get("/:id", async (req, res, next) => {
  try {
    const level = await prisma.customLevel.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { username: true, avatarColor: true } } },
    });
    if (!level || !level.published) {
      res.status(404).json({ error: "Level not found" });
      return;
    }
    await prisma.customLevel.update({
      where: { id: level.id },
      data: { plays: { increment: 1 } },
    });
    res.json({ level });
  } catch (err) {
    next(err);
  }
});

customRouter.post("/", requireAuth, validate(createSchema), async (req: AuthedRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSchema>;
    const count = await prisma.customLevel.count({ where: { authorId: req.user!.sub } });
    if (count >= 30) {
      res.status(400).json({ error: "Maximum 30 custom levels per account" });
      return;
    }
    const level = await prisma.customLevel.create({
      data: {
        authorId: req.user!.sub,
        name: body.name,
        description: body.description,
        difficulty: body.difficulty,
        data: body.data,
      },
    });
    await grantAchievement(req.user!.sub, "publisher");
    res.status(201).json({ level });
  } catch (err) {
    next(err);
  }
});

customRouter.post("/:id/like", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const levelId = req.params.id;
    const existing = await prisma.levelLike.findUnique({
      where: { userId_levelId: { userId: req.user!.sub, levelId } },
    });
    if (existing) {
      await prisma.levelLike.delete({ where: { userId_levelId: { userId: req.user!.sub, levelId } } });
      const level = await prisma.customLevel.update({
        where: { id: levelId },
        data: { likes: { decrement: 1 } },
      });
      res.json({ liked: false, likes: level.likes });
      return;
    }
    await prisma.levelLike.create({ data: { userId: req.user!.sub, levelId } });
    const level = await prisma.customLevel.update({
      where: { id: levelId },
      data: { likes: { increment: 1 } },
    });
    if (level.likes >= 5) {
      await grantAchievement(level.authorId, "liked");
    }
    res.json({ liked: true, likes: level.likes });
  } catch (err) {
    next(err);
  }
});

customRouter.delete("/:id", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const level = await prisma.customLevel.findUnique({ where: { id: req.params.id } });
    if (!level) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (level.authorId !== req.user!.sub && req.user!.role !== "admin") {
      res.status(403).json({ error: "Not your level" });
      return;
    }
    await prisma.customLevel.delete({ where: { id: level.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
