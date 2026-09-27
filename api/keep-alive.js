const { timingSafeEqual } = require("node:crypto");

const DEFAULT_RENDER_URL = "https://shop-seed-art.onrender.com/healthz";
const REQUEST_TIMEOUT_MS = 90000;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const secret = process.env.KEEPALIVE_SECRET;
  if (secret) {
    const provided = Buffer.from(req.headers.authorization || "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
  }

  const target = process.env.RENDER_URL || DEFAULT_RENDER_URL;
  const startedAt = Date.now();

  try {
    const renderResponse = await fetch(target, {
      method: "GET",
      headers: { "User-Agent": "Shop-Seed-Art-KeepAlive/1.0" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const success = renderResponse.ok;
    return res.status(success ? 200 : 502).json({
      success,
      target,
      renderStatus: renderResponse.status,
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      ...(success ? {} : { error: "Render health check returned a non-2xx status" }),
    });
  } catch (error) {
    const timedOut = error && error.name === "TimeoutError";
    return res.status(timedOut ? 504 : 502).json({
      success: false,
      target,
      renderStatus: null,
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      error: timedOut ? "Render health check timed out" : "Unable to reach Render health endpoint",
    });
  }
};