/**
 * PromptForge Video — lightweight API layer.
 *
 * Owns all AI-gateway communication so credentials never reach the browser.
 * Provider-agnostic: the 9Router adapter below can be swapped without
 * touching route logic. Runs with zero dependencies (node:http).
 *
 *   NINEROUTER_API_KEY   gateway key (server-side only)
 *   NINEROUTER_BASE_URL  defaults to https://api.9router.com/v1
 *   PORT                 defaults to 8791
 */
import http from "node:http";

const PORT = process.env.PORT ?? 8791;
const GATEWAY_KEY = process.env.NINEROUTER_API_KEY ?? "";
const GATEWAY_URL =
  process.env.NINEROUTER_BASE_URL ?? "https://api.9router.com/v1";

// ---- provider adapter (swap this to change gateways) ----
const provider = {
  configured: () => Boolean(GATEWAY_KEY),
  /** Placeholder: wire chat/transcription calls to the gateway here. */
  async complete(_task, _payload) {
    throw new Error("AI gateway call not implemented in MVP stub");
  },
};

const json = (res, code, body) => {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    return res.end();
  }

  if (req.url === "/api/health") {
    return json(res, 200, { ok: true, aiConfigured: provider.configured() });
  }

  // Transcription / analysis need a configured gateway + media pipeline.
  // The frontend treats non-2xx as "backend unavailable" and falls back
  // to its deterministic local pipeline.
  if (req.url === "/api/transcribe" || req.url === "/api/analyze-video") {
    if (!provider.configured()) {
      return json(res, 503, {
        error: "AI gateway not configured. Set NINEROUTER_API_KEY.",
      });
    }
    return json(res, 501, {
      error:
        "Media pipeline not implemented in this MVP build. Wire provider.complete() to your gateway.",
    });
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`PromptForge API listening on :${PORT}`);
  console.log(
    provider.configured()
      ? "AI gateway: configured"
      : "AI gateway: NOT configured (set NINEROUTER_API_KEY)"
  );
});
