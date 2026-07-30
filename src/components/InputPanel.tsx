import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore, ProcessingState } from "../stores/project";
import { Preset } from "../schemas/universal";
import { ServerHealth } from "../services/aiProvider";

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
  /** null while unknown — the auto-transcript copy depends on it. */
  const [aiReady, setAiReady] = useState<boolean | null>(null);

  useEffect(() => {
    ServerHealth.check().then(setAiReady);
  }, []);

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
          videoFile: file,
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
  const selected = s.basePreset();
  const effective = s.selectedPreset();

  return (
    <div className="panel p-4 space-y-5 overflow-y-auto">
      {/* Video is optional — a prompt is generated from the preset alone, so
          this stays a single compact row rather than a large drop target. */}
      <div
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
        className={`rounded-lg border px-3 py-2 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-line"
        }`}
      >
        {s.source.media_type === "video" ? (
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span aria-hidden>🎬</span>
            <span className="truncate text-zinc-300 flex-1 min-w-0">
              {s.source.file_name}
              <span className="text-zinc-600">
                {" "}
                · {s.source.duration_seconds}s · {s.source.aspect_ratio}
              </span>
            </span>
            <button
              className="text-zinc-500 hover:text-red-400 shrink-0"
              aria-label="Remove video"
              onClick={() => {
                if (s.videoObjectUrl) URL.revokeObjectURL(s.videoObjectUrl);
                s.set({
                  source: { media_type: "text_only" },
                  videoObjectUrl: null,
                  videoFile: null,
                  analysis: null,
                });
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            className="w-full flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300"
            onClick={() => fileRef.current?.click()}
          >
            <span aria-hidden>＋</span>
            <span>Attach source video</span>
            <span className="ml-auto text-zinc-700">optional</span>
          </button>
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
      {fileError && <p className="text-xs text-red-400 -mt-3">{fileError}</p>}

      <div>
        <span className="field-label">Transcript</span>
        <div className="flex gap-1 mb-2" role="tablist" aria-label="Transcript mode">
          {(
            [
              ["manual", "Manual Locked"],
              ["auto", "Auto from Vocal"],
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
            <p className="text-[11px] text-zinc-500 mb-1.5">
              The most reliable path: type what is actually said in the video.
              It is placed at the very end of the generated prompt, where
              spoken lines land most consistently.
            </p>
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
        {s.transcriptMode === "auto" && aiReady === true && (
          <p className="text-[11px] text-zinc-500">
            The audio is transcribed on Generate, and speakers are separated by
            voice. Timings are model-estimated rather than force-aligned, so
            captions can drift by a fraction of a second — for a guaranteed
            word-for-word match use <strong>Manual Locked</strong>. A video is
            required, and clearly articulated speech markedly improves the result.
          </p>
        )}
        {s.transcriptMode === "auto" && aiReady === false && (
          <p className="text-[11px] text-amber-500/90">
            ⚠ The AI backend is not connected, so nothing is transcribed here. Captions
            cannot be word-locked — the prompt will instead order the video model to
            transcribe the audio itself, and its accuracy cannot be verified. For a
            guaranteed word-for-word match, use <strong>Manual Locked</strong>.
            Whichever you pick, clearly articulated speech in the source video
            markedly improves the result.
          </p>
        )}
        {s.transcriptMode === "auto" && s.source.media_type !== "video" && (
          <p className="text-[11px] text-amber-500/90 mt-1.5">
            ⚠ No video attached — there is no audio to transcribe.
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
        <div className="flex items-center justify-between mb-1.5">
          <span className="field-label mb-0">Characters</span>
          <button
            className="text-[11px] text-primary hover:underline"
            onClick={() => s.addCharacter()}
          >
            ＋ Add character
          </button>
        </div>
        <p className="text-[11px] text-zinc-500 mb-2">
          Describe anyone the model has to <strong>invent</strong> rather than
          preserve. Locking a character demands the same face and wardrobe in
          every shot — generated video drifts otherwise.
        </p>
        {s.characters.length === 0 && (
          <p className="text-[11px] text-zinc-600">
            None. The prompt will not describe who appears on screen.
          </p>
        )}
        <div className="space-y-2">
          {s.characters.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-line bg-panel2/50 p-2.5 space-y-2"
            >
              <div className="flex items-center gap-2">
                <input
                  className="text-input py-1 text-xs flex-1"
                  value={c.name}
                  placeholder="Name"
                  onChange={(e) =>
                    s.updateCharacter(c.id, { name: e.target.value })
                  }
                  aria-label={`Character name for ${c.id}`}
                />
                <button
                  className="text-zinc-500 hover:text-red-400 shrink-0 text-xs"
                  onClick={() => s.removeCharacter(c.id)}
                  aria-label={`Remove ${c.name}`}
                >
                  ✕
                </button>
              </div>
              <textarea
                className="text-input text-xs min-h-[54px]"
                value={c.appearance}
                placeholder="Appearance — face, build, hair, skin tone. Required."
                onChange={(e) =>
                  s.updateCharacter(c.id, { appearance: e.target.value })
                }
                aria-label={`Appearance for ${c.name}`}
              />
              {!c.appearance.trim() && (
                <p className="text-[11px] text-amber-500/90">
                  ⚠ Without an appearance this character is skipped — the model
                  would otherwise draw whoever it likes.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="text-input py-1 text-xs"
                  value={c.role ?? ""}
                  placeholder="Role (optional)"
                  onChange={(e) =>
                    s.updateCharacter(c.id, { role: e.target.value || undefined })
                  }
                  aria-label={`Role for ${c.name}`}
                />
                <input
                  className="text-input py-1 text-xs"
                  value={c.age_range ?? ""}
                  placeholder="Age range (optional)"
                  onChange={(e) =>
                    s.updateCharacter(c.id, {
                      age_range: e.target.value || undefined,
                    })
                  }
                  aria-label={`Age range for ${c.name}`}
                />
                <input
                  className="text-input py-1 text-xs"
                  value={c.wardrobe ?? ""}
                  placeholder="Wardrobe (optional)"
                  onChange={(e) =>
                    s.updateCharacter(c.id, {
                      wardrobe: e.target.value || undefined,
                    })
                  }
                  aria-label={`Wardrobe for ${c.name}`}
                />
                <input
                  className="text-input py-1 text-xs"
                  value={c.voice ?? ""}
                  placeholder="Voice (optional)"
                  onChange={(e) =>
                    s.updateCharacter(c.id, { voice: e.target.value || undefined })
                  }
                  aria-label={`Voice for ${c.name}`}
                />
              </div>
              <input
                className="text-input py-1 text-xs"
                value={c.mannerisms ?? ""}
                placeholder="Mannerisms / how they carry themselves (optional)"
                onChange={(e) =>
                  s.updateCharacter(c.id, {
                    mannerisms: e.target.value || undefined,
                  })
                }
                aria-label={`Mannerisms for ${c.name}`}
              />
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-zinc-300">Lock across shots</span>
                <input
                  type="checkbox"
                  className="accent-violet-500 h-3.5 w-3.5"
                  checked={c.lock_across_shots}
                  onChange={(e) =>
                    s.updateCharacter(c.id, {
                      lock_across_shots: e.target.checked,
                    })
                  }
                />
              </label>
              {/* Linking matters only when there is footage to preserve. */}
              {s.source.media_type === "video" && (
                <div>
                  <label className="field-label" htmlFor={`spk-${c.id}`}>
                    Is this the person on camera?
                  </label>
                  <select
                    id={`spk-${c.id}`}
                    className="text-input py-1 text-xs"
                    value={c.speaker_id ?? ""}
                    onChange={(e) =>
                      s.updateCharacter(c.id, {
                        speaker_id: e.target.value || undefined,
                      })
                    }
                  >
                    <option value="">No — a separate, generated person</option>
                    {s.speakers.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        Yes — {sp.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
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
        <p className="text-[11px] text-zinc-500 mt-1.5">
          {selected?.description}
        </p>

        {/* What the preset actually puts in the prompt, tunable in place. */}
        {selected && (
          <div className="mt-3 rounded-lg border border-line bg-panel2/50 p-3 space-y-3">
            <p className="text-[11px] text-zinc-500 -mb-1">
              Preset settings — these shape what{" "}
              <strong className="text-zinc-400">Generate</strong> builds. Editing
              them here rebuilds the whole plan; to adjust a project you have
              already generated, use Visual Controls instead.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["pacing", "Pacing", ["relaxed", "standard", "high_retention", "fast"]],
                  ["punch_in_frequency", "Punch-ins", ["off", "low", "medium", "medium_high", "high"]],
                  ["b_roll_frequency", "B-roll", ["off", "low", "medium", "high"]],
                  ["typography_frequency", "Typography", ["off", "low", "medium", "high"]],
                ] as const
              ).map(([key, label, options]) => (
                <div key={key}>
                  <label className="field-label" htmlFor={`ov-${key}`}>
                    {label}
                  </label>
                  <select
                    id={`ov-${key}`}
                    className="text-input py-1 text-xs"
                    value={effective.editing[key]}
                    onChange={(e) =>
                      s.set({
                        presetOverrides: {
                          ...s.presetOverrides,
                          editing: {
                            ...(s.presetOverrides.editing ?? {}),
                            [key]: e.target.value,
                          },
                        },
                      })
                    }
                  >
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div>
              <span className="field-label">Sound design</span>
              <div className="flex gap-1">
                {(["low", "medium", "high"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() =>
                      s.set({
                        presetOverrides: {
                          ...s.presetOverrides,
                          sfxIntensity: lvl,
                        },
                      })
                    }
                    className={`tab-btn flex-1 ${
                      effective.sound_design.intensity === lvl
                        ? "bg-primary/15 text-primary"
                        : "bg-panel2 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="field-label">Background</span>
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-zinc-300">Replace background</span>
                <input
                  type="checkbox"
                  className="accent-violet-500 h-3.5 w-3.5"
                  checked={effective.background_replacement_default ?? false}
                  onChange={(e) =>
                    s.set({
                      presetOverrides: {
                        ...s.presetOverrides,
                        backgroundReplacement: e.target.checked,
                      },
                    })
                  }
                />
              </label>
              <p className="text-[11px] text-zinc-600 mt-1">
                {effective.environment ?? "Keeps the original setting."}
              </p>
            </div>

            {!!effective.visual_effects?.length && (
              <div>
                <span className="field-label">Visual effects</span>
                <div className="flex flex-wrap gap-1">
                  {effective.visual_effects.map((fx) => (
                    <span
                      key={fx}
                      className="chip bg-panel2 border border-line text-zinc-400"
                    >
                      {fx.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!!effective.sfx_palette?.length && (
              <div>
                <span className="field-label">SFX palette</span>
                <div className="flex flex-wrap gap-1">
                  {effective.sfx_palette.map((fx) => (
                    <span
                      key={fx}
                      className="chip bg-panel2 border border-line text-zinc-400"
                    >
                      {fx.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(s.presetOverrides).length > 0 && (
              <button
                className="text-[11px] text-primary hover:underline"
                onClick={() => s.set({ presetOverrides: {} })}
              >
                Reset to preset defaults
              </button>
            )}
          </div>
        )}
      </div>


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
        {/* The AI pass degrades rather than fails, so its caveats are a note,
            not an error — the JSON below is still valid. */}
        {s.aiNotice && s.processing === "complete" && (
          <p className="text-[11px] text-amber-500/90 mt-2">⚠ {s.aiNotice}</p>
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
