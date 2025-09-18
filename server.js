// server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";

// TEMP demo MP4 (so your app flow works end-to-end)
// Swap this with a real TikTok resolver later.
const DEMO_MP4 =
  "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4";

const app = express();
app.use(cors());
app.use(morgan("tiny"));

// Root (so you can verify the service is up)
app.get("/", (req, res) => {
  res.send("TikTok Resolver API is running. Use /resolve?url=<TikTokURL>");
});

// Health check for Render
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// JSON resolver: returns a playable URL (for your UI to consume)
app.get("/resolve", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

    // TODO: replace with real resolve logic that gets a signed CDN or HLS URL
    return res.json({
      ok: true,
      source: url,
      playableUrl: DEMO_MP4,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "resolver-failed" });
  }
});

// Redirect helper (handy for <video src="...">)
app.get("/resolve/mp4", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("Missing url");
    return res.redirect(302, DEMO_MP4);
  } catch (err) {
    console.error(err);
    res.status(500).send("resolver-failed");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`tt-resolver listening on ${PORT}`);
});
