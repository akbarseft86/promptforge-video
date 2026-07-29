# PromptForge Video

Turn any video idea into structured AI editing instructions.

PromptForge Video converts raw video, transcripts, and natural-language editing
instructions into a validated, platform-agnostic **Universal Video Editing JSON**
— a master representation of an intended edit that can later be adapted into
prompts for Veo, Kling, Runway, Sora, and other AI video systems.

## Run

```bash
npm install
npm run dev        # frontend on http://localhost:5173
npm run server     # optional API layer on :8791 (AI gateway keys live here)
```

Build: `npm run build` (type-checks + bundles to `dist/`).

## What works in this MVP

- **Four input modes** — text only, video + prompt, video + manual transcript,
  and full-auto (auto mode's transcription requires the AI backend; see below).
- **Video upload** with client-side metadata extraction (duration, resolution,
  aspect ratio, size) and inline preview. Files are never persisted.
- **Locked transcript system** — a manual transcript is the immutable source of
  truth; segmentation for dialogue timing never alters a word. Locked fields
  (transcript text, source metadata, speaker IDs, schema version) are injected
  deterministically by code, never produced by a model.
- **Universal JSON generation** — a deterministic interpreter combines the
  editing instructions, the selected preset, and the custom style prompt into a
  timeline-aware Universal JSON where every event carries a semantic `reason`.
- **Canonical state sync** — visual controls and the raw JSON editor edit the
  same underlying project object (Zustand store); valid raw-JSON edits flow
  back into the visual editor instantly.
- **Strict validator** — Zod schema validation plus semantic checks: transcript
  token integrity (missing / extra / duplicated / reordered words), speaker
  references, timeline bounds and negative durations, effect density,
  preservation conflicts, aspect-ratio/platform mismatches. Severities:
  PASS / INFO / WARNING / ERROR.
- **36 built-in presets** across 7 categories, searchable and filterable, plus
  custom presets (duplicate, edit, delete, import/export as validated JSON,
  persisted in localStorage).
- **Subject-sharpness protection** — when a real person must survive the edit,
  the prompt scopes depth of field, bokeh, glow and particles to the background
  and forbids blurring, smoothing, or downscaling the speaker. Stacking those
  effects with background replacement and relighting otherwise softens the face.
- **Works from a preset alone** — no video, transcript, or instructions
  required; the timeline is then planned against a target duration recorded as
  `output.target_duration_seconds`.
- **AI preset recommendation** (rule-based locally; designed to be replaced by
  the semantic-analysis service).
- **Human-readable prompt generator** — a faithful natural-language rendering
  of the JSON that adds nothing absent from it.
- **Platform adapters** — Universal / Veo / Kling / Runway / Sora, behind a
  common `VideoPromptAdapter` interface.
- **Local persistence** of the last project, inputs, presets, and model
  preferences; "Clear Local Data" in Settings.

## The AI backend

`server/index.mjs` is a zero-dependency API layer (node:http + ffmpeg) that owns
all gateway communication — 9Router by default, and the provider adapter is
swappable. Configure it with:

```bash
NINEROUTER_API_KEY=…                       # required
NINEROUTER_BASE_URL=https://api.9router.com/v1
NINEROUTER_MODEL=gemini/gemini-3.5-flash   # must be multimodal (audio + image)
```

`ffmpeg` and `ffprobe` must be on PATH.

| Endpoint | Does |
| --- | --- |
| `GET /api/health` | reachability + whether the gateway is configured |
| `POST /api/upload` | raw binary body → temp file, returns an `uploadId` |
| `POST /api/transcribe` | ffmpeg extracts mono 16 kHz audio → model transcribes and separates speakers |
| `POST /api/analyze-video` | ffmpeg samples 8 keyframes → model returns scene/framing/insight analysis |
| `POST /api/discard` | deletes the upload immediately |

Uploads live in a temp dir and are deleted as soon as the client is done; a
sweep also removes anything older than `UPLOAD_TTL_MS` (default 30 min),
scanning the directory by mtime so a restart cannot orphan files.

**Timing accuracy.** The gateway has no word-level ASR, so word timings are
interpolated across each returned segment and reported as
`timing_precision: "estimated"`. They are fine for pacing captions, but they
are not forced alignment — the locked-transcript guarantee comes from
**Manual Locked** entry, which never depends on the model.

**Upload size.** The client caps at 500 MB, but a proxy in front (e.g.
Cloudflare) may cap request bodies far lower — ~100 MB is typical. The upload
call surfaces a 413 as a readable error.

The frontend detects backend availability via `/api/health` and degrades
gracefully to the deterministic local pipeline when it's absent: every step of
the AI pass is non-fatal, and any problem is surfaced as a note beside the
Generate button rather than blocking generation.

## Architecture

```
src/
  schemas/universal.ts       Zod schema + TS types (Universal JSON v1.0, presets)
  services/generation.ts     deterministic instruction → Universal JSON
  services/humanPrompt.ts    faithful natural-language rendering
  services/aiProvider.ts     frontend AI service layer (talks only to /api)
  adapters/index.ts          VideoPromptAdapter contract + platform adapters
  features/presets/          built-ins, localStorage persistence, validation
  features/validator/        structural + semantic + transcript-integrity checks
  stores/project.ts          canonical project state (single source of truth)
  components/                Workspace / Input / Timeline / Editor / Presets / Settings
server/index.mjs             API layer; gateway keys server-side only
```

Core principle: **facts** (source metadata, dialogue, timing) and **locks**
(preserve voice, locked transcript) are controlled by deterministic code;
**creative decisions** (punch-ins, B-roll, typography, SFX) are suggestions
that can never overwrite a factual or locked field.
