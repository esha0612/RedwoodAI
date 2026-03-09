import "dotenv/config";
import cors from "cors";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { connectDB } from "./db";

const app = express();
const httpServer = createServer(app);

// Allow frontend on Vercel (or other host) to call this API when CORS_ORIGIN is set (e.g. https://your-app.vercel.app)
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: corsOrigin
      ? corsOrigin.split(",").map((s) => s.trim())
      : process.env.NODE_ENV === "production"
        ? false
        : true,
    credentials: true,
  }),
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await connectDB();
  await registerRoutes(httpServer, app);
  await seedDatabase();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // Production: serve built client from server/public if present; otherwise show a simple API landing page
  if (process.env.NODE_ENV === "production") {
    const staticServed = serveStatic(app);
    if (!staticServed) {
      app.get("/", (_req, res) => {
        res.type("html").send(`
          <!DOCTYPE html>
          <html>
            <head><title>RedwoodAI API</title></head>
            <body style="font-family: system-ui; max-width: 600px; margin: 2rem auto; padding: 0 1rem;">
              <h1>RedwoodAI API</h1>
              <p>Backend is running. Use the client app or call the API directly.</p>
              <ul>
                <li><a href="/api/documents">GET /api/documents</a></li>
                <li><a href="/api/assessments">GET /api/assessments</a></li>
                <li><a href="/api/pipeline/status">GET /api/pipeline/status</a></li>
              </ul>
            </body>
          </html>
        `);
      });
    }
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
