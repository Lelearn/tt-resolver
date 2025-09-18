// server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch";

// Fallback demo MP4 so your app never “breaks” while we iterate
const DEMO_MP4 =
   "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

/* -------------------- TikTok resolver helpers -------------------- */

// Make requests look like a real browser; TikTok blocks generic bots.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Sec-Fetch-Dest": "document",
};

// Pull the JSON blob TikTok puts in <script id="SIGI_STATE">…</script>
function extractSigiState(html) {
  const m =
    html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/) ||
    html.match(/window\.__INIT_PROPS__\s*=\s*({[\s\S]*?});/); // fallback
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

// Given SIGI_STATE, find a playable url (prefer H.264/hls, then mp4)
function pickPlayableFromState(state) {
  if (state && state.ItemModule) {
    const items = Object.values(state.ItemModule);
    if (items.length) {
      const v = (items[0] && items[0].video) || {};
      return (
        v.playAddrH264 || // best
        v.playAddr ||     // common
        v.downloadAddr || // fallback
        v.playAddrH265 || // last resort
        null
      );
    }
  }
  return null;
}

// Very light regex fallback if SIGI_STATE path changes
function fallbackScan(html) {
  // Look for a direct https://...mp4 in the HTML as a last resort
  const mp4 = html.match(/https:\/\/[^\s"'\\]+\.mp4/);
  if (mp4) return mp4[0];

  // Sometimes HLS master appears in inline JSON
  const m3u8 = html.match(/https:\/\/[^\s"'\\]+\.m3u8/);
  if (m3u8) return m3u8[0];

  return null;
}

// Normalize user-pasted URL (strip tracking params)
function normalizeTikTokUrl(raw) {
  try {
    const u = new URL(raw.trim());
    u.search = ""; // drop tracking params to reduce cache collisions
    return u.toString();
  } catch {
    return raw;
  }
}

// The main resolver: fetch HTML, parse SIGI_STATE, return a playable URL
async function getTikTokPlayableUrl(inputUrl) {
  const target = normalizeTikTokUrl(inputUrl);

  const res = await fetch(target, {
    method: "GET",
    headers: BROWSER_HEADERS,
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`TikTok fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();

  // 1) Preferred parse path
  const sigi = extractSigiState(html);
  const fromState = pickPlayableFromState(sigi);
  if (fromState) return fromState;

  // 2) Super-light fallback scan (keeps your app flowing)
  const fromScan = fallbackScan(html);
  if (fromScan) return fromScan;

  // 3) Final fallback
  return DEMO_MP4;
}

/* -------------------------- Express app -------------------------- */

const app = express();
app.use(cors());
app.use(morgan("tiny"));

// Root: quick check that the service is up
app.get("/", (_req, res) =>
  res.send("TikTok Resolver API is running. Use /resolve?url=<TikTokURL>")
);

// Health check for Render
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// JSON resolver (your UI should call this)
app.get("/resolve", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ ok: false, error: "Missing url" });
  try {
    const playable = await getTikTokPlayableUrl(String(url));
    return res.json({ ok: true, source: String(url), playableUrl: playable });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "resolver-failed" });
  }
});

// Redirect helper (handy for <video src="…"> or quick manual tests)
app.get("/resolve/mp4", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing url");
  try {
    const playable = await getTikTokPlayableUrl(String(url));
    return res.redirect(302, playable);
  } catch (err) {
    console.error(err);
    return res.status(500).send("resolver-failed");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`tt-resolver listening on ${PORT}`);
});
