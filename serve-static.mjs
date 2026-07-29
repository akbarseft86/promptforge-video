/**
 * Static file server for the built PromptForge Video frontend.
 *
 * Zero dependencies (node:http), matching the repo's server/index.mjs style.
 * Serves dist/ with SPA fallback to index.html.
 *
 *   PORT      defaults to 8792
 *   DIST_DIR  defaults to ./dist
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 8792;
const DIST = process.env.DIST_DIR ?? path.join(HERE, "dist");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const send = (res, code, body, headers = {}) => {
  res.writeHead(code, headers);
  res.end(body);
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  // Reject path traversal: resolve inside DIST or fall back to the SPA shell.
  const target = path.join(DIST, path.normalize(url.pathname));
  const safe = target.startsWith(DIST) ? target : DIST;

  fs.stat(safe, (err, stat) => {
    const file = !err && stat.isFile() ? safe : path.join(DIST, "index.html");
    const ext = path.extname(file);
    fs.readFile(file, (readErr, buf) => {
      if (readErr) return send(res, 404, "Not found");
      // Hashed asset filenames are immutable; the HTML shell must not be cached.
      const cache = file.includes(`${path.sep}assets${path.sep}`)
        ? "public, max-age=31536000, immutable"
        : "no-cache";
      send(res, 200, buf, {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": cache,
      });
    });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`PromptForge static server on 127.0.0.1:${PORT} serving ${DIST}`);
});
