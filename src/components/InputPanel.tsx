import { useCallback, useRef, useState } from "react";
import { useProjectStore, ProcessingState } from "../stores/project";
import { Preset } from "../schemas/universal";

/** Custom presets group under "Custom"; built-ins under their own category. */
const groupOf = (p: Preset) =>
  p.builtin === false ? "Custom" : (p.category ?? "Other");

const MAX_SIZE_BYTES = 500 * 1024 * 1024;
const ACCEPTED = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];

const STATE_LABELS: Record<ProcessingState, string> = {
  idle: "",
  uploading: "Uploading…",
  extracting_audio: "Extracting Audio…",
  analyzing_vocal: "Analyzing Vocal…",
  transcribing: "Transcribing…",
  detecting_speakers: "Detecting Speakers…",
  analyzing_scenes: "Analyzing Scenes…",
  understanding_content: "Understanding Content…",
  building_timeline: "Building Timeline…",
  generating_json: "Generating JSON…",
  validating: "Validating…",
  complete: "Complete",
  error: "Error",
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function InputPanel() {
  const s = useProjectStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);
      if (!ACCEPTED.includes(file.type) && !/\.(mp4|webm|mov|mkv)$/i.test(file.name)) {
        setFileError(`Unsupported format: ${file.type || file.name}`);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setFileError("File exceeds the 500 MB limit.");
        return;
      }
      const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const w = video.videoWidth;
        const h = video.videoHeight;
        const g = w && h ? gcd(w, h) : 1;
        s.set({
          videoObjectUrl: url,
          source: {
            media_type: "video",
            file_name: safeName,
            duration_seconds: Number(video.duration.toFixed(2)),
            resolution: w && h ? `${w}x${h}` : undefined,
            aspect_ratio: w && h ? `${w / g}:${h / g}` : undefined,
            size_bytes: file.size,
          },
        });
        s.refreshRecommendation();
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        setFileError("Could not read this video file — it may be corrupted.");
      };
      video.src = url;
    },
    [s]
  );

  const busy =
    s.processing !== "idle" &&
    s.processing !== "complete" &&
    s.processing !== "error";

  const allPresets = s.allPresets();

  return (
    <div className="panel p-4 space-y-5 overflow-y-auto">
      <div>
        <span className="field-label">Video Upload</span>
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload video file"
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`rounded-lg border border-dashed p-4 text-center cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-line hover:border-primary/50"
          }`}
        >
          {s.source.media_type === "video" ? (
            <div className="text-left text-xs space-y-1">
              <p className="font-medium text-zinc-200 truncate">{s.source.file_name}</p>
              <p className="text-zinc-500">
                {s.source.duration_seconds}s · {s.source.resolution} ·{" "}
                {s.source.aspect_ratio} ·{" "}
                {((s.source.size_bytes ?? 0) / (1024 * 1024)).toFixed(1)} MB
              </p>
              <button
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  if (s.videoObjectUrl) URL.revokeObjectURL(s.videoObjectUrl);
                  s.set({ source: { media_type: "text_only" }, videoObjectUrl: null });
                }}
              >
                Remove video (start from text)
              </button>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm text-zinc-300">Drop a video here or click to browse</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                MP4, WebM, MOV · up to 500 MB · optimized for 0–5 min clips
              </p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
        {fileError && <p className="text-xs text-red-400 mt-1">{fileError}</p>}
        {s.source.media_type === "video" && (
          <p className="text-[11px] text-zinc-600 mt-1.5">
            Your video is processed temporarily for analysis only and is not retained.
          </p>
        )}
      </div>

      <div>
        <span className="field-label">Transcript</span>
        <div className="flex gap-1 mb-2" role="tablist" aria-label="Transcript mode">
          {(
            [
              ["auto", "Auto from Vocal"],
              ["manual", "Manual Locked"],
              ["none", "None"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              role="tab"
              aria-selected={s.transcriptMode === mode}
              onClick={() => s.set({ transcriptMode: mode })}
              className={`tab-btn ${
                s.transcriptMode === mode
                  ? "bg-primary/15 text-primary"
                  : "bg-panel2 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {s.transcriptMode === "manual" && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="chip bg-amber-500/15 text-amber-400 border border-amber-500/30">
                🔒 LOCKED TRANSCRIPT
              </span>
              <span className="text-[11px] text-zinc-500">AI cannot rewrite this text.</span>
            </div>
            <textarea
              className="text-input font-mono min-h-[90px]"
              placeholder="Paste the exact dialogue…"
              value={s.manualTranscript}
              onChange={(e) => s.set({ manualTranscript: e.target.value })}
              aria-label="Manual locked transcript"
            />
            <input
              className="text-input mt-2"
              placeholder="Language code (e.g. id, en) — optional"
              value={s.language}
              onChange={(e) => s.set({ language: e.target.value })}
              aria-label="Transcript language"
            />
          </div>
        )}
        {s.transcriptMode === "auto" && (
          <p className="text-[11px] text-amber-500/90">
            ⚠ The AI backend is not connected, so nothing is transcribed here. Captions
            cannot be word-locked — the prompt will instead order the video model to
            transcribe the audio itself, and its accuracy cannot be verified. For a
            guaranteed word-for-word match, use <strong>Manual Locked</strong>.
          </p>
        )}
        {s.transcriptMode === "none" && (
          <p className="text-[11px] text-zinc-600">
            No captions or kinetic typography will be generated, since there is no
            dialogue to quote verbatim.
          </p>
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="instructions">
          Editing Instructions
        </label>
        <textarea
          id="instructions"
          className="text-input min-h-[110px]"
          placeholder="Describe how you want this video edited…"
          value={s.instructions}
          onChange={(e) => s.set({ instructions: e.target.value })}
          onBlur={() => s.refreshRecommendation()}
        />
      </div>

      <div>
        <span className="field-label">Editing Preset</span>
        {s.recommendedPresetId && (
          <div className="mb-2 rounded-lg bg-primary/10 border border-primary/25 p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-primary font-medium">
                ✨ AI Recommended:{" "}
                {allPresets.find((p) => p.id === s.recommendedPresetId)?.name}
              </span>
              {s.selectedPresetId !== s.recommendedPresetId && (
                <button
                  className="text-primary underline"
                  onClick={() => s.set({ selectedPresetId: s.recommendedPresetId! })}
                >
                  Use it
                </button>
              )}
            </div>
            <p className="text-zinc-400 mt-1">{s.recommendationReason}</p>
          </div>
        )}
        <select
          className="text-input"
          value={s.selectedPresetId}
          onChange={(e) => s.set({ selectedPresetId: e.target.value })}
          aria-label="Editing preset"
        >
          {[...new Set(allPresets.map(groupOf))].map((cat) => (
            <optgroup key={cat} label={cat}>
              {allPresets
                .filter((p) => groupOf(p) === cat)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <p className="text-[11px] text-zinc-600 mt-1">
          {allPresets.length} presets available
        </p>
        <p className="text-[11px] text-zinc-600 mt-1">
          {allPresets.find((p) => p.id === s.selectedPresetId)?.description}
        </p>
      </div>

      {s.source.media_type !== "video" && (
        <div>
          <label className="field-label" htmlFor="targetDuration">
            Target Duration (seconds)
          </label>
          <input
            id="targetDuration"
            type="number"
            min={1}
            max={600}
            className="text-input"
            value={s.targetDurationSeconds}
            onChange={(e) =>
              s.set({ targetDurationSeconds: Number(e.target.value) || 15 })
            }
          />
          <p className="text-[11px] text-zinc-600 mt-1">
            No video attached, so the timeline is planned against this intended
            length. Recorded as <code>output.target_duration_seconds</code>.
          </p>
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="customStyle">
          Custom Style (optional)
        </label>
        <input
          id="customStyle"
          className="text-input"
          placeholder='e.g. "premium AI startup commercial, minimal captions"'
          value={s.customStyle}
          onChange={(e) => s.set({ customStyle: e.target.value })}
          onBlur={() => s.refreshRecommendation()}
        />
      </div>

      <div className="pt-1">
        <button
          className="btn-primary w-full justify-center"
          disabled={busy}
          onClick={() => s.generate()}
        >
          {busy ? STATE_LABELS[s.processing] : "⚡ Generate Universal JSON"}
        </button>
        {s.processing === "error" && (
          <p className="text-xs text-red-400 mt-2" role="alert">
            {s.processingError} —{" "}
            <button className="underline" onClick={() => s.generate()}>
              retry
            </button>
          </p>
        )}
        {busy && (
          <div className="mt-2 h-1 rounded bg-panel2 overflow-hidden" aria-hidden>
            <div className="h-full w-1/2 bg-primary/70 animate-pulse rounded" />
          </div>
        )}
      </div>
    </div>
  );
}
