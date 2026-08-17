import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { verifyToken } from "./lib/jwt.js";

let io: Server | null = null;
const online = new Map<string, { username: string; color: string }>();

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.isProd ? true : config.clientOrigin,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    let userId: string | null = null;

    socket.on("auth", (token: string) => {
      try {
        const payload = verifyToken(token);
        userId = payload.sub;
        online.set(userId, { username: payload.username, color: "#00f5ff" });
        io?.emit("online", { count: online.size });
      } catch {
        /* guest */
      }
    });

    socket.on("join-level", (levelId: string) => {
      if (typeof levelId === "string" && levelId.length < 80) {
        socket.join(`level:${levelId}`);
      }
    });

    socket.on("leave-level", (levelId: string) => {
      socket.leave(`level:${levelId}`);
    });

    socket.on("disconnect", () => {
      if (userId) {
        online.delete(userId);
        io?.emit("online", { count: online.size });
      }
    });
  });

  return io;
}

export async function emitLeaderboard(levelId: string) {
  if (!io) return;
  const best = await prisma.levelProgress.findMany({
    where: { levelId, completed: true },
    orderBy: [{ bestTimeMs: "asc" }, { attempts: "asc" }],
    take: 10,
    include: { user: { select: { username: true, avatarColor: true } } },
  });
  io.to(`level:${levelId}`).emit("leaderboard:update", {
    levelId,
    entries: best.map((row, i) => ({
      rank: i + 1,
      username: row.user.username,
      avatarColor: row.user.avatarColor,
      timeMs: row.bestTimeMs,
      attempts: row.attempts,
    })),
  });
  io.emit("feed", {
    type: "clear",
    levelId,
    username: best[0]?.user.username,
    at: Date.now(),
  });
}

export function getOnlineCount() {
  return online.size;
}
