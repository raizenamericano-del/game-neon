import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { authRouter } from "./routes/auth.js";
import { progressRouter } from "./routes/progress.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { profileRouter } from "./routes/profile.js";
import { achievementsRouter } from "./routes/achievements.js";
import { customRouter } from "./routes/customLevels.js";
import { dailyRouter } from "./routes/daily.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { initSocket, getOnlineCount } from "./socket.js";
import { OFFICIAL_LEVELS } from "./data/official.js";
import { seedOnBoot } from "./lib/seedOnBoot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

initSocket(server);

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());
app.use(
  cors({
    origin: config.isProd ? true : config.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "400kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many auth attempts, try again later" },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

app.get("/api/health", async (_req, res) => {
  let db = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "down";
  }
  res.json({
    ok: true,
    service: "neon-dash",
    time: new Date().toISOString(),
    db,
    online: getOnlineCount(),
  });
});

app.get("/api/levels", (_req, res) => {
  res.json({ levels: OFFICIAL_LEVELS });
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/progress", progressRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/profile", profileRouter);
app.use("/api/achievements", achievementsRouter);
app.use("/api/custom", customRouter);
app.use("/api/daily", dailyRouter);
app.use("/api/admin", adminRouter);

const clientDir = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDir, { maxAge: config.isProd ? "7d" : 0, index: false }));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
    next();
    return;
  }
  res.sendFile(path.join(clientDir, "index.html"), (err) => {
    if (err) next();
  });
});

app.use("/api", notFound);
app.use(errorHandler);

server.listen(config.port, "0.0.0.0", async () => {
  console.log(`NEON DASH listening on :${config.port} (${config.nodeEnv})`);
  await seedOnBoot();
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
