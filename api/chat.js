const MAX_BODY_BYTES = 8192;
const MAX_MESSAGE_LENGTH = 1000;
const REQUEST_TIMEOUT_MS = 15000;
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 20;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!String(req.headers["content-type"] || "").toLowerCase().includes("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "Request body is too large" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "Request body is too large" });
  }
  if (typeof body.message !== "string" || !body.message.trim() || body.message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: "Message must be a non-empty string of at most 1000 characters" });
  }

  const now = Date.now();
  for (const [ip, entry] of requestCounts) {
    if (now - entry.startedAt >= RATE_LIMIT_WINDOW_MS) requestCounts.delete(ip);
  }
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = (typeof forwardedFor === "string" ? forwardedFor.split(",")[0] : "") ||
    req.socket?.remoteAddress || "unknown";
  const rateEntry = requestCounts.get(ip);
  if (rateEntry && now - rateEntry.startedAt < RATE_LIMIT_WINDOW_MS && rateEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (!rateEntry || now - rateEntry.startedAt >= RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(ip, { startedAt: now, count: 1 });
  } else {
    rateEntry.count += 1;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Chat service is not configured" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a friendly, concise assistant for NNP Christian Union. Help with CU activities and Christian ministry."
          },
          { role: "user", content: body.message.trim() }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Chat service is temporarily unavailable" });
    }
    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return res.status(502).json({ error: "Chat service returned an invalid response" });
    }
    return res.status(200).json({ text: text.trim() });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? "Chat service timed out" : "Chat service is temporarily unavailable"
    });
  } finally {
    clearTimeout(timeout);
  }
}
