import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }

  const anyErr = err as { status?: number; message?: string; code?: string };
  if (anyErr?.code === "P2002") {
    res.status(409).json({ error: "Already exists" });
    return;
  }

  console.error("[error]", err);
  res.status(anyErr?.status || 500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : anyErr?.message || "Error",
  });
}
