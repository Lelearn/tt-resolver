// server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";

// For now we return a safe demo MP4 for testing.
// Later we'll swap this to a real TikTok resolver.
const DEMO_MP4 =
  "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4";

const app = express();
app.use(cors());
app.use(morgan("tiny"));

// Root route so you see something at /
app.get("/", (_req, res) => {
  res.send("TikTok Resolver API is running. Use /resolve?url=<TikTokURL>");
});

// Health check for Render
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// GET /resolve?url=<tiktok url>
// Returns JSON: { ok, source, playableUrl }
app.get("/resolve", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ ok: false, error: "Missing url parameter" });
  }

  // TODO: replace with real resolver logic.
  // For now, always return a demo MP4 so Render + your app flow works.
  return res.json({
    ok: true,
    source: url,
    playableUrl: DEMO_MP4,
    type: "mp4",
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`tt-resolver listening on ${PORT}`);
});
