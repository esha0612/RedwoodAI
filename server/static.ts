import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Returns true if static serving was set up, false if skipped (no public dir). */
export function serveStatic(app: Express): boolean {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.warn(
      `[static] Skipping static file serving – build directory not found at ${distPath}`,
    );
    return false;
  }

  app.use(express.static(distPath));
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
  return true;
}
