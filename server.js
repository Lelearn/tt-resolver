// server.js
import express from "express";
import morgan from "morgan";
import cors from "cors";

// --- Tiny “passthrough” placeholder ---
// For now we return a safe demo MP4 for testing.
// Later we'll swap this to a real TikTok resolver.
const DEMO_MP4 =
  "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4";

const app = express();
app.use(cors());
app.use(morgan("tiny"));

// 👇 add this right after you define `const app = express();`
app.get('/', (req, res) => {
  res.send('TikTok Resolver API is running. Use /resolve?url=<TikTokURL>')
})

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

/**
 * GET /resolve?url=<tiktok url>
 * Returns JSON: { playableUrl: "<direct mp4 or HLS url>" }
 */
app.get("/resolve", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "Missing ?url" });
    }

    // TODO: replace with real resolver logic.
    // For now, always return a demo MP4 so Render + your app flow works.
    return res.json({
      ok: true,
      source: url,
      playableUrl: DEMO_MP4
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "resolver-failed" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`tt-resolver listening on :${PORT}`);
});
