/**
 * PromptForge Video — API layer.
 *
 * Owns all AI-gateway communication so credentials never reach the browser.
 * Provider-agnostic: the 9Router adapter below can be swapped without
 * touching route logic. Runs with zero dependencies (node:http + ffmpeg).
 *
 *   NINEROUTER_API_KEY   gateway key (server-side only)
 *   NINEROUTER_BASE_URL  defaults to https://api.9router.com/v1
 *   NINEROUTER_MODEL     multimodal model id (default gemini/gemini-3.5-flash)
 *   PORT                 defaults to 8791
 *   UPLOAD_TTL_MS        how long an upload survives on disk (default 30 min)
 *
 * Media handling: uploads land in a temp dir, are read by ffmpeg, and are
 * deleted as soon as the client says it is done (and on a TTL sweep
 * regardless). Nothing is kept beyond the requests that needed it.
 */
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";

const PORT = process.env.PORT ?? 8791;
const GATEWAY_KEY = process.env.NINEROUTER_API_KEY ?? "";
const GATEWAY_URL =
  process.env.NINEROUTER_BASE_URL ?? "https://api.9router.com/v1";
const MODEL = process.env.NINEROUTER_MODEL ?? "gemini/gemini-3.5-flash";

const UPLOAD_DIR = path.join(os.tmpdir(), "promptforge-uploads");
const UPLOAD_TTL_MS = Number(process.env.UPLOAD_TTL_MS ?? 30 * 60 * 1000);
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // mirrors the client-side limit
/** Audio beyond this is truncated: the gateway rejects very large payloads. */
const MAX_AUDIO_SECONDS = 20 * 60;
const KEYFRAME_COUNT = 8;

// ---- provider adapter (swap this to change gateways) ----
const provider = {
  configured: () => Boolean(GATEWAY_KEY),

  /**
   * One non-streaming chat completion. `content` may be a plain string or an
   * array of OpenAI-style multimodal parts (text / input_audio / image_url).
   *
   * The gateway rotates upstream keys, so a request can fail transiently with
   * 5xx or "entity was not found" and succeed moments later — hence the retry.
   */
  async complete(content, { maxTokens = 4096, system, attempts = 3 } = {}) {
    if (!GATEWAY_KEY) throw new Error("AI gateway not configured");
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content });
    const body = JSON.stringify({
      model: MODEL,
      stream: false,
      max_tokens: maxTokens,
      messages,
    });

    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GATEWAY_KEY}`,
            "Content-Type": "application/json",
          },
          body,
        });

        const raw = await res.text();
        if (!res.ok) {
          const err = new Error(`gateway ${res.status}: ${raw.slice(0, 300)}`);
          // 4xx that is not rate limiting means the request itself is wrong.
          err.retryable = res.status >= 500 || res.status === 429;
          throw err;
        }
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw Object.assign(
            new Error(`gateway returned non-JSON: ${raw.slice(0, 200)}`),
            { retryable: true }
          );
        }
        if (parsed?.error) {
          throw Object.assign(
            new Error(`gateway: ${parsed.error.message ?? "unknown error"}`),
            { retryable: true }
          );
        }
        const text = parsed?.choices?.[0]?.message?.content;
        if (typeof text !== "string" || !text.trim()) {
          const reason = parsed?.choices?.[0]?.finish_reason ?? "unknown";
          throw Object.assign(
            new Error(`gateway returned no content (finish_reason: ${reason})`),
            { retryable: reason !== "length" }
          );
        }
        return text;
      } catch (err) {
        lastError = err;
        if (err.retryable === false || attempt === attempts) break;
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
    throw lastError;
  },
};

/**
 * Models wrap JSON in prose or code fences often enough that asking nicely is
 * not enough — pull out the first balanced object and parse that.
 */
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(`no JSON object in model output: ${text.slice(0, 200)}`);
  }
  return JSON.parse(body.slice(start, end + 1));
}

const run = (cmd, args, { timeoutMs = 300000 } = {}) =>
  new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`${cmd} failed: ${stderr || err.message}`));
        resolve(stdout);
      }
    );
  });

// ---- upload registry ----
/** uploadId -> { filePath, fileName, createdAt } */
const uploads = new Map();

/**
 * Sweeps by mtime on disk rather than by registry entry: a restart empties the
 * in-memory map, and anything it still had would otherwise leak permanently.
 */
async function sweepUploads() {
  const cutoff = Date.now() - UPLOAD_TTL_MS;
  for (const [id, up] of uploads) {
    if (up.createdAt < cutoff) uploads.delete(id);
  }
  let entries;
  try {
    entries = await fsp.readdir(UPLOAD_DIR);
  } catch {
    return; // dir not created yet
  }
  for (const name of entries) {
    const file = path.join(UPLOAD_DIR, name);
    try {
      const stat = await fsp.stat(file);
      if (stat.mtimeMs < cutoff) {
        uploads.delete(name);
        await fsp.rm(file, { force: true });
      }
    } catch {
      /* raced with another sweep or a discard */
    }
  }
}
setInterval(sweepUploads, 60_000).unref();

async function discardUpload(id) {
  const up = uploads.get(id);
  if (!up) return;
  uploads.delete(id);
  await fsp.rm(up.filePath, { force: true }).catch(() => {});
}

const json = (res, code, body) => {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
};

const readJsonBody = (req, limit = 1024 * 1024) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });

/**
 * Uploads arrive as a raw binary body rather than multipart: both ends are
 * ours, and streaming straight to disk avoids hand-parsing multipart.
 */
function receiveUpload(req, filePath) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const out = fs.createWriteStream(filePath);
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_UPLOAD_BYTES) {
        out.destroy();
        req.destroy();
        reject(new Error("upload exceeds 500 MB limit"));
      }
    });
    req.on("error", reject);
    out.on("error", reject);
    out.on("finish", () => resolve(size));
    req.pipe(out);
  });
}

// ---- media pipeline ----

async function probeDuration(filePath) {
  const out = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const seconds = Number.parseFloat(out.trim());
  return Number.isFinite(seconds) ? seconds : 0;
}

/** Mono 16 kHz mp3 — small enough to inline, plenty for speech. */
async function extractAudio(filePath, workDir) {
  const audioPath = path.join(workDir, "audio.mp3");
  await run("ffmpeg", [
    "-i", filePath,
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-b:a", "32k",
    "-t", String(MAX_AUDIO_SECONDS),
    "-y", audioPath,
  ]);
  return audioPath;
}

async function extractKeyframes(filePath, workDir, duration) {
  const pattern = path.join(workDir, "frame-%02d.jpg");
  // Spread frames across the clip rather than clustering at the start.
  const fps = duration > 0 ? KEYFRAME_COUNT / duration : 1;
  await run("ffmpeg", [
    "-i", filePath,
    "-vf", `fps=${fps.toFixed(6)},scale=640:-2`,
    "-frames:v", String(KEYFRAME_COUNT),
    "-q:v", "6",
    "-y", pattern,
  ]);
  const files = (await fsp.readdir(workDir))
    .filter((f) => f.startsWith("frame-") && f.endsWith(".jpg"))
    .sort();
  return files.map((f) => path.join(workDir, f));
}

/**
 * Word timings are interpolated across each segment, not force-aligned: the
 * gateway has no word-level ASR. Good enough to drive caption pacing, and the
 * locked-transcript path (manual entry) never depends on it.
 */
function deriveWords(segments) {
  const words = [];
  for (const seg of segments) {
    const tokens = String(seg.text ?? "").trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    const start = Number(seg.start) || 0;
    const end = Number(seg.end) || start;
    const span = Math.max(end - start, tokens.length * 0.08);
    const per = span / tokens.length;
    tokens.forEach((word, i) => {
      words.push({
        word,
        start: Number((start + i * per).toFixed(3)),
        end: Number((start + (i + 1) * per).toFixed(3)),
        speaker_id: seg.speaker_id ?? "speaker_1",
      });
    });
  }
  return words;
}

const TRANSCRIBE_SYSTEM =
  "You are a precise speech transcriber. You transcribe exactly what is said, " +
  "never paraphrasing, translating, correcting grammar, or inventing content. " +
  "You respond with JSON only — no prose, no code fences.";

async function transcribeUpload(up) {
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "pfv-work-"));
  try {
    const duration = await probeDuration(up.filePath);
    const audioPath = await extractAudio(up.filePath, workDir);
    const audio = await fsp.readFile(audioPath);

    const text = await provider.complete(
      [
        {
          type: "text",
          text:
            "Transcribe this audio verbatim, in its original language.\n" +
            "Split it into short segments at natural speech boundaries, and " +
            "attribute each segment to a speaker (speaker_1, speaker_2, …) by voice.\n" +
            "Return exactly this JSON shape:\n" +
            '{"language":"<ISO 639-1 code>","segments":[' +
            '{"start":<seconds>,"end":<seconds>,"speaker_id":"speaker_1","text":"…"}]}\n' +
            `The audio is ${duration.toFixed(1)} seconds long; timestamps must stay within it. ` +
            "If there is no intelligible speech, return an empty segments array.",
        },
        {
          type: "input_audio",
          input_audio: { data: audio.toString("base64"), format: "mp3" },
        },
      ],
      { system: TRANSCRIBE_SYSTEM, maxTokens: 8192 }
    );

    const parsed = extractJson(text);
    const segments = Array.isArray(parsed.segments) ? parsed.segments : [];
    const speakerIds = [
      ...new Set(segments.map((s) => s.speaker_id ?? "speaker_1")),
    ];

    return {
      text: segments.map((s) => String(s.text ?? "").trim()).filter(Boolean).join(" "),
      language: typeof parsed.language === "string" ? parsed.language : undefined,
      speakers: speakerIds.map((id, i) => ({ id, label: `Speaker ${i + 1}` })),
      words: deriveWords(segments),
      segments,
      // Timings are model-estimated, not force-aligned. Surfaced so the UI can
      // avoid presenting them as verified.
      timing_precision: "estimated",
      truncated: duration > MAX_AUDIO_SECONDS,
    };
  } finally {
    await fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

const ANALYZE_SYSTEM =
  "You are a video editing analyst. You describe only what is visible in the " +
  "frames given to you, never inventing detail. You respond with JSON only.";

async function analyzeUpload(up) {
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "pfv-work-"));
  try {
    const duration = await probeDuration(up.filePath);
    const frames = await extractKeyframes(up.filePath, workDir, duration);
    if (!frames.length) throw new Error("no frames could be extracted");

    const parts = [
      {
        type: "text",
        text:
          `These ${frames.length} frames are sampled evenly across a ` +
          `${duration.toFixed(1)}-second video, in order.\n` +
          "Analyse them for a video editor and return exactly this JSON:\n" +
          '{"scenes":<int>,"speech_detected":<bool>,"speaker_count":<int>,' +
          '"orientation":"vertical|horizontal|square",' +
          '"quality":"low|medium|high","framing":"close_up|medium|wide|mixed",' +
          '"semantic_insights":[{"start":<sec>,"end":<sec>,' +
          '"observation":"…","recommendation":"…"}]}\n' +
          "Give at most 5 insights, each tied to a time range within the video. " +
          "speech_detected should reflect whether people appear to be talking on camera.",
      },
    ];
    for (const f of frames) {
      const buf = await fsp.readFile(f);
      parts.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${buf.toString("base64")}` },
      });
    }

    const parsed = extractJson(
      await provider.complete(parts, { system: ANALYZE_SYSTEM, maxTokens: 4096 })
    );

    const insights = Array.isArray(parsed.semantic_insights)
      ? parsed.semantic_insights.slice(0, 5).map((i) => ({
          start: Number(i.start) || 0,
          end: Number(i.end) || 0,
          observation: String(i.observation ?? ""),
          recommendation: String(i.recommendation ?? ""),
        }))
      : [];

    return {
      scenes: Number(parsed.scenes) || frames.length,
      speech_detected: Boolean(parsed.speech_detected),
      speaker_count: Number(parsed.speaker_count) || 0,
      orientation: String(parsed.orientation ?? "unknown"),
      quality: String(parsed.quality ?? "unknown"),
      framing: String(parsed.framing ?? "unknown"),
      semantic_insights: insights,
      recommended_preset_id:
        typeof parsed.recommended_preset_id === "string"
          ? parsed.recommended_preset_id
          : undefined,
    };
  } finally {
    await fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ---- routes ----

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-File-Name",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    return res.end();
  }

  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      aiConfigured: provider.configured(),
      model: MODEL,
    });
  }

  if (url.pathname === "/api/upload" && req.method === "POST") {
    if (!provider.configured()) {
      return json(res, 503, {
        error: "AI gateway not configured. Set NINEROUTER_API_KEY.",
      });
    }
    const id = crypto.randomUUID();
    const fileName = (req.headers["x-file-name"] ?? "video").toString().slice(0, 200);
    const filePath = path.join(UPLOAD_DIR, id);
    try {
      await fsp.mkdir(UPLOAD_DIR, { recursive: true });
      const size = await receiveUpload(req, filePath);
      if (!size) throw new Error("empty upload");
      uploads.set(id, { filePath, fileName, createdAt: Date.now() });
      return json(res, 200, { uploadId: id, bytes: size });
    } catch (err) {
      await fsp.rm(filePath, { force: true }).catch(() => {});
      return json(res, 400, { error: err.message });
    }
  }

  if (
    (url.pathname === "/api/transcribe" || url.pathname === "/api/analyze-video") &&
    req.method === "POST"
  ) {
    if (!provider.configured()) {
      return json(res, 503, {
        error: "AI gateway not configured. Set NINEROUTER_API_KEY.",
      });
    }
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return json(res, 400, { error: "invalid JSON body" });
    }
    const up = uploads.get(body.uploadId);
    if (!up) {
      return json(res, 404, { error: "unknown or expired uploadId" });
    }
    try {
      const result =
        url.pathname === "/api/transcribe"
          ? await transcribeUpload(up)
          : await analyzeUpload(up);
      return json(res, 200, result);
    } catch (err) {
      console.error(`${url.pathname} failed:`, err.message);
      return json(res, 502, { error: err.message });
    }
  }

  // The client calls this once it has what it needs, so media does not sit
  // around waiting for the TTL sweep.
  if (url.pathname === "/api/discard" && req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return json(res, 400, { error: "invalid JSON body" });
    }
    await discardUpload(body.uploadId);
    return json(res, 200, { ok: true });
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`PromptForge API listening on :${PORT}`);
  console.log(
    provider.configured()
      ? `AI gateway: configured (${MODEL} via ${GATEWAY_URL})`
      : "AI gateway: NOT configured (set NINEROUTER_API_KEY)"
  );
});
