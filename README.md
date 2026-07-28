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
  and full-auto (auto mode's transcription requires the AI backend).
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
- **7 built-in presets** + custom presets (duplicate, edit, delete,
  import/export as validated JSON, persisted in localStorage).
- **AI preset recommendation** (rule-based locally; designed to be replaced by
  the semantic-analysis service).
- **Human-readable prompt generator** — a faithful natural-language rendering
  of the JSON that adds nothing absent from it.
- **Platform adapters** — Universal / Veo / Kling / Runway / Sora, behind a
  common `VideoPromptAdapter` interface.
- **Local persistence** of the last project, inputs, presets, and model
  preferences; "Clear Local Data" in Settings.

## What requires wiring the AI backend

`server/index.mjs` is a zero-dependency API stub that owns all gateway
communication (9Router by default; the provider adapter is swappable). Set
`NINEROUTER_API_KEY` and implement `provider.complete()` plus a media pipeline
(audio extraction → transcription → diarization → word alignment → semantic
analysis) to light up:

- automatic transcription with word-level timestamps
- speaker diarization
- scene/semantic video analysis and AI-driven preset recommendation

The frontend detects backend availability via `/api/health` and degrades
gracefully to the deterministic local pipeline when it's absent.

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
