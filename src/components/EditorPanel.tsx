import { useState } from "react";
import { useProjectStore } from "../stores/project";
import { UniversalVideoProject } from "../schemas/universal";
import { generateHumanPrompt, PromptOptions } from "../services/humanPrompt";
import { ADAPTERS } from "../adapters";
import { copyToClipboard } from "../utils/clipboard";
import {
  ENVIRONMENT_OPTIONS,
  ENVIRONMENT_VALUES,
} from "../features/presets/environments";
import { STYLE_OPTIONS, STYLE_VALUES } from "../features/presets/styles";

type Tab = "visual" | "json" | "validate" | "export";

const SEVERITY_STYLE: Record<string, string> = {
  PASS: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  INFO: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  WARNING: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  ERROR: "bg-red-500/10 border-red-500/30 text-red-400",
};

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs py-1 cursor-pointer">
      <span className="text-zinc-300">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-violet-500 h-3.5 w-3.5"
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <button
        className="w-full flex justify-between items-center px-3 py-2 bg-panel2 text-xs font-semibold text-zinc-300 hover:text-white"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {title}
        <span className="text-zinc-600">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

export default function EditorPanel() {
  const s = useProjectStore();
  const [tab, setTab] = useState<Tab>("visual");
  const [adapterId, setAdapterId] = useState("universal");
  const [copied, setCopied] = useState<string | null>(null);
  const p = s.project;

  const [promptOpts, setPromptOpts] = useState<PromptOptions>({});
  const [copyFailed, setCopyFailed] = useState<string | null>(null);
  const copy = async (text: string, key: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(key);
      setCopyFailed(null);
      setTimeout(() => setCopied(null), 1500);
    } else {
      setCopyFailed(key);
      setTimeout(() => setCopyFailed(null), 3000);
    }
  };

  const download = () => {
    if (!p) return;
    const blob = new Blob([JSON.stringify(p, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${p.project.name.toLowerCase().replace(/\s+/g, "-")}.universal-video.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const up = (fn: (proj: UniversalVideoProject) => void) =>
    s.updateProject((proj) => {
      fn(proj);
      return proj;
    });

  const tabs: [Tab, string][] = [
    ["visual", "Visual Controls"],
    ["json", "Raw JSON"],
    ["validate", "Validation"],
    ["export", "Export"],
  ];

  return (
    <div className="panel p-4 flex flex-col gap-3 overflow-hidden">
      <div className="flex gap-1 flex-wrap" role="tablist" aria-label="Editor tabs">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`tab-btn ${
              tab === t ? "bg-primary/15 text-primary" : "bg-panel2 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {copyFailed && (
        <p className="text-xs text-amber-400" role="alert">
          Clipboard copy is blocked by your browser on this connection — select the
          text below manually and copy it (Cmd/Ctrl+C).
        </p>
      )}

      {!p && (
        <p className="text-xs text-zinc-600 py-8 text-center">
          Generate a project to review and edit the Universal JSON here.
        </p>
      )}

      {p && tab === "visual" && (
        <div className="space-y-2.5 overflow-y-auto pr-1">
          <Section title="Preservation Locks">
            {(
              Object.keys(p.speaker_preservation) as (keyof typeof p.speaker_preservation)[]
            ).map((k) => (
              <Toggle
                key={k}
                label={k.replace(/_/g, " ")}
                checked={p.speaker_preservation[k]}
                onChange={(v) =>
                  up((proj) => {
                    proj.speaker_preservation[k] = v;
                    if (k === "clothing") proj.constraints.no_wardrobe_change = v;
                    if (k === "identity") proj.constraints.no_identity_change = v;
                    if (k === "voice") {
                      proj.constraints.no_voice_change = v;
                      proj.audio.preserve_original_voice = v;
                    }
                  })
                }
              />
            ))}
          </Section>

          <Section title="Editing">
            <label className="field-label">Pacing</label>
            <select
              className="text-input mb-2"
              value={p.editing.pacing}
              onChange={(e) =>
                up((proj) => {
                  proj.editing.pacing = e.target.value as typeof proj.editing.pacing;
                })
              }
            >
              {["relaxed", "standard", "high_retention", "fast"].map((x) => (
                <option key={x} value={x}>
                  {x.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            {(
              [
                ["auto_reframe", "Auto reframe"],
                ["punch_ins", "Punch-ins"],
                ["dynamic_zoom", "Dynamic zoom"],
                ["b_roll", "B-roll"],
                ["motion_graphics", "Motion graphics"],
                ["transitions", "Transitions"],
                ["speed_ramps", "Speed ramps"],
              ] as const
            ).map(([k, label]) => (
              <Toggle
                key={k}
                label={label}
                checked={p.editing[k]}
                onChange={(v) => up((proj) => ((proj.editing[k] as boolean) = v))}
              />
            ))}
          </Section>

          <Section title="Visual Direction">
            <label className="field-label">Style</label>
            {(() => {
              const style = p.visual_direction.style;
              // A custom style prompt is appended as "<preset> + custom: …",
              // which is a legitimate value the picker must not flatten.
              const isListed = STYLE_VALUES.includes(style);
              return (
                <>
                  <select
                    className="text-input mb-2"
                    value={isListed ? style : "__custom__"}
                    aria-label="Visual style"
                    onChange={(e) =>
                      up((proj) => {
                        const v = e.target.value;
                        proj.visual_direction.style =
                          v === "__custom__" ? proj.visual_direction.style : v;
                      })
                    }
                  >
                    {STYLE_OPTIONS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.items.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="__custom__">Write my own…</option>
                  </select>
                  {!isListed && (
                    <input
                      className="text-input mb-2"
                      placeholder="Describe the visual style…"
                      value={style}
                      aria-label="Custom visual style"
                      onChange={(e) =>
                        up((proj) => (proj.visual_direction.style = e.target.value))
                      }
                    />
                  )}
                </>
              );
            })()}
            <label className="field-label">Environment</label>
            {(() => {
              const env = p.visual_direction.environment ?? "";
              // Anything not in the list is treated as a custom entry, so a
              // preset's own wording or a hand-typed one is never clobbered.
              const isListed = env === "" || ENVIRONMENT_VALUES.includes(env);
              return (
                <>
                  <select
                    className="text-input mb-2"
                    value={isListed ? env : "__custom__"}
                    aria-label="Environment"
                    onChange={(e) =>
                      up((proj) => {
                        const v = e.target.value;
                        proj.visual_direction.environment =
                          v === "__custom__"
                            ? (proj.visual_direction.environment ?? "") || " "
                            : v || undefined;
                      })
                    }
                  >
                    <option value="">Keep the original setting</option>
                    {ENVIRONMENT_OPTIONS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.items.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="__custom__">Write my own…</option>
                  </select>
                  {!isListed && (
                    <input
                      className="text-input mb-2"
                      autoFocus
                      placeholder="Describe the environment…"
                      value={env.trim()}
                      aria-label="Custom environment"
                      onChange={(e) =>
                        up(
                          (proj) =>
                            (proj.visual_direction.environment =
                              e.target.value || " ")
                        )
                      }
                    />
                  )}
                </>
              );
            })()}
            <Toggle
              label="Cinematic relighting"
              checked={p.visual_direction.cinematic_relighting}
              onChange={(v) => up((proj) => (proj.visual_direction.cinematic_relighting = v))}
            />
            <Toggle
              label="Background replacement"
              checked={p.visual_direction.background_replacement}
              onChange={(v) => up((proj) => (proj.visual_direction.background_replacement = v))}
            />
          </Section>

          <Section title="Captions">
            {p.captions ? (
              <>
                <Toggle
                  label="Enabled"
                  checked={p.captions.enabled}
                  onChange={(v) => up((proj) => (proj.captions!.enabled = v))}
                />
                <Toggle
                  label="Word synchronized"
                  checked={p.captions.word_synchronized}
                  onChange={(v) => up((proj) => (proj.captions!.word_synchronized = v))}
                />
                <Toggle
                  label="Kinetic typography"
                  checked={p.captions.kinetic_typography}
                  onChange={(v) => up((proj) => (proj.captions!.kinetic_typography = v))}
                />
                <Toggle
                  label="Prevent face overlap"
                  checked={p.captions.prevent_face_overlap}
                  onChange={(v) => up((proj) => (proj.captions!.prevent_face_overlap = v))}
                />
              </>
            ) : (
              <button
                className="btn-ghost text-xs"
                onClick={() =>
                  up(
                    (proj) =>
                      (proj.captions = {
                        enabled: true,
                        source: "locked_transcript",
                        word_for_word: true,
                        word_synchronized: true,
                        prevent_face_overlap: true,
                        allow_future_dialogue: false,
                        kinetic_typography: true,
                      })
                  )
                }
              >
                + Add captions module
              </button>
            )}
          </Section>

          <Section title="Music & Sound">
            {p.background_music ? (
              <>
                <Toggle
                  label="Background music"
                  checked={p.background_music.enabled}
                  onChange={(v) => up((proj) => (proj.background_music!.enabled = v))}
                />
                <label className="field-label mt-1">Styles (comma-separated)</label>
                <input
                  className="text-input mb-2"
                  value={p.background_music.style.join(", ")}
                  onChange={(e) =>
                    up(
                      (proj) =>
                        (proj.background_music!.style = e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean))
                    )
                  }
                />
                <Toggle
                  label="Dialogue ducking"
                  checked={p.background_music.dialogue_ducking}
                  onChange={(v) => up((proj) => (proj.background_music!.dialogue_ducking = v))}
                />
              </>
            ) : (
              <p className="text-[11px] text-zinc-600 mb-1">No music module.</p>
            )}
            {p.sound_design && (
              <>
                <label className="field-label mt-1">SFX intensity</label>
                <select
                  className="text-input"
                  value={p.sound_design.intensity}
                  onChange={(e) =>
                    up(
                      (proj) =>
                        (proj.sound_design!.intensity = e.target.value as "low" | "medium" | "high")
                    )
                  }
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </>
            )}
          </Section>

          <Section title="Output">
            <label className="field-label">Aspect ratio</label>
            <input
              className="text-input mb-2"
              value={p.output.aspect_ratio ?? ""}
              onChange={(e) =>
                up((proj) => (proj.output.aspect_ratio = e.target.value || undefined))
              }
            />
            <span className="field-label">Platforms</span>
            {(["instagram_reels", "tiktok", "youtube_shorts", "youtube"] as const).map((plat) => (
              <Toggle
                key={plat}
                label={plat.replace(/_/g, " ")}
                checked={p.output.platform_targets.includes(plat)}
                onChange={(v) =>
                  up((proj) => {
                    proj.output.platform_targets = v
                      ? [...proj.output.platform_targets, plat]
                      : proj.output.platform_targets.filter((x) => x !== plat);
                  })
                }
              />
            ))}
          </Section>

          <Section title="Negative Constraints">
            {(Object.keys(p.constraints) as (keyof typeof p.constraints)[]).map((k) => (
              <Toggle
                key={k}
                label={k.replace(/_/g, " ")}
                checked={p.constraints[k] ?? false}
                onChange={(v) => up((proj) => (proj.constraints[k] = v))}
              />
            ))}
          </Section>
        </div>
      )}

      {p && tab === "json" && (
        <div className="flex flex-col gap-2 min-h-0 flex-1">
          <div className="flex gap-2 flex-wrap">
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                try {
                  s.applyRawJson(JSON.stringify(JSON.parse(s.rawJsonDraft), null, 2));
                } catch {
                  /* keep error state */
                }
              }}
            >
              Format
            </button>
            <button className="btn-ghost text-xs" onClick={() => copy(s.rawJsonDraft, "raw")}>
              {copied === "raw" ? "✓ Copied" : "Copy"}
            </button>
            <button
              className="btn-ghost text-xs"
              onClick={() => p && s.applyRawJson(JSON.stringify(p, null, 2))}
            >
              Reset
            </button>
          </div>
          {s.rawJsonError && (
            <p className="text-xs text-red-400" role="alert">
              JSON parse error: {s.rawJsonError}
            </p>
          )}
          <textarea
            className="text-input font-mono text-[11px] leading-relaxed flex-1 min-h-[320px] whitespace-pre"
            spellCheck={false}
            value={s.rawJsonDraft}
            onChange={(e) => s.applyRawJson(e.target.value)}
            aria-label="Raw Universal JSON editor"
          />
          <p className="text-[11px] text-zinc-600">
            Valid edits sync back to the visual editor — both views share one canonical
            project object.
          </p>
        </div>
      )}

      {p && tab === "validate" && (
        <div className="space-y-2 overflow-y-auto">
          <button className="btn-primary" onClick={() => s.runValidation()}>
            ✓ Validate JSON
          </button>
          {s.validation?.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg border px-3 py-2 text-xs ${SEVERITY_STYLE[r.severity]}`}
            >
              <p className="font-semibold">
                {r.severity} — {r.title}
              </p>
              <p className="text-zinc-400 mt-0.5">{r.detail}</p>
            </div>
          ))}
        </div>
      )}

      {p && tab === "export" && (
        <div className="space-y-3 overflow-y-auto">
          <div className="rounded-lg border border-line bg-panel2/50 p-3">
            <span className="field-label">Prompt sections</span>
            <Toggle
              label="Timeline directions (timestamped events)"
              checked={promptOpts.includeTimeline ?? false}
              onChange={(v) =>
                setPromptOpts({ ...promptOpts, includeTimeline: v })
              }
            />
            <Toggle
              label="Image fidelity (keep the speaker sharp)"
              checked={promptOpts.includeFidelity ?? true}
              onChange={(v) =>
                setPromptOpts({ ...promptOpts, includeFidelity: v })
              }
            />
            <p className="text-[11px] text-zinc-600 mt-1">
              Turn these off one at a time if a video tool refuses the prompt —
              they are the sections most likely to describe editing it cannot
              perform. Timeline is off by default because Gemini Omni renders
              8–10s per generation and cannot honour clip-wide timings.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              className="btn-primary text-xs"
              onClick={() => copy(JSON.stringify(p, null, 2), "json")}
            >
              {copied === "json" ? "✓ Copied" : "Copy Universal JSON"}
            </button>
            <button className="btn-ghost text-xs" onClick={download}>
              Download .json
            </button>
            <button
              className="btn-ghost text-xs"
              onClick={() => copy(generateHumanPrompt(p, promptOpts), "human")}
            >
              {copied === "human" ? "✓ Copied" : "Copy Human Prompt"}
            </button>
          </div>

          <div>
            <span className="field-label">Platform Adapter</span>
            <div className="flex gap-1 flex-wrap mb-2">
              {ADAPTERS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAdapterId(a.id)}
                  className={`tab-btn ${
                    adapterId === a.id
                      ? "bg-primary/15 text-primary"
                      : "bg-panel2 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
            {(() => {
              const adapter = ADAPTERS.find((a) => a.id === adapterId)!;
              const result = adapter.transform(p);
              return (
                <div>
                  {result.notes && (
                    <p className="text-[11px] text-zinc-500 mb-1.5">{result.notes}</p>
                  )}
                  <pre className="bg-panel2 border border-line rounded-lg p-3 text-[11px] font-mono whitespace-pre-wrap max-h-72 overflow-y-auto text-zinc-300">
                    {result.content}
                  </pre>
                  <button
                    className="btn-ghost text-xs mt-2"
                    onClick={() => copy(result.content, `adapter-${adapter.id}`)}
                  >
                    {copied === `adapter-${adapter.id}` ? "✓ Copied" : `Copy ${adapter.name} prompt`}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
