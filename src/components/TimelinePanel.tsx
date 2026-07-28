import { useMemo, useState } from "react";
import { useProjectStore } from "../stores/project";
import { TimelineEvent } from "../schemas/universal";

const TRACK_ORDER: { type: TimelineEvent["type"]; label: string; color: string }[] = [
  { type: "camera", label: "Camera", color: "bg-violet-500/70" },
  { type: "kinetic_typography", label: "Typography", color: "bg-blue-500/70" },
  { type: "b_roll", label: "B-roll", color: "bg-emerald-500/70" },
  { type: "motion_graphics", label: "Motion", color: "bg-cyan-500/70" },
  { type: "emphasis", label: "Emphasis", color: "bg-amber-500/70" },
  { type: "sound_effect", label: "SFX", color: "bg-pink-500/70" },
  { type: "transition", label: "Transitions", color: "bg-indigo-500/70" },
  { type: "speed_ramp", label: "Speed", color: "bg-orange-500/70" },
  { type: "caption_segment", label: "Captions", color: "bg-teal-500/70" },
];

export default function TimelinePanel() {
  const s = useProjectStore();
  const [selected, setSelected] = useState<string | null>(null);
  const p = s.project;

  const duration = useMemo(() => {
    if (p?.source.duration_seconds) return p.source.duration_seconds;
    const maxEvent = Math.max(
      0,
      ...(p?.timeline.map((e) => e.end) ?? []),
      ...(p?.dialogue_timeline.map((d) => d.end) ?? [])
    );
    return maxEvent || 10;
  }, [p]);

  const tracks = useMemo(() => {
    if (!p) return [];
    return TRACK_ORDER.map((t) => ({
      ...t,
      events: p.timeline.filter((e) => e.type === t.type),
    })).filter((t) => t.events.length > 0);
  }, [p]);

  const selectedEvent = p?.timeline.find((e) => e.id === selected) ?? null;

  return (
    <div className="panel p-4 space-y-4 overflow-y-auto">
      {/* Preview */}
      {s.videoObjectUrl ? (
        <video
          src={s.videoObjectUrl}
          controls
          className="w-full max-h-64 rounded-lg bg-black"
          aria-label="Source video preview"
        />
      ) : (
        <div className="rounded-lg bg-panel2 border border-line h-32 flex items-center justify-center text-xs text-zinc-600">
          {p ? "Text-only project — no source video" : "Upload a video or generate from text to see the editing plan"}
        </div>
      )}

      {!p && (
        <div className="text-center py-8">
          <p className="text-sm text-zinc-400">
            Turn videos into structured AI editing prompts.
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Upload footage, analyze dialogue and scenes, and generate
            production-ready Universal Video JSON.
          </p>
        </div>
      )}

      {p && (
        <>
          {/* Speakers */}
          <section>
            <span className="field-label">Speakers</span>
            <div className="space-y-1.5">
              {s.speakers.map((sp) => (
                <div key={sp.id} className="flex items-center gap-2">
                  <span className="chip bg-panel2 border border-line text-zinc-500 font-mono shrink-0">
                    {sp.id}
                  </span>
                  <input
                    className="text-input py-1 text-xs"
                    value={sp.label}
                    aria-label={`Rename ${sp.id}`}
                    onChange={(e) => s.renameSpeaker(sp.id, e.target.value)}
                  />
                  {s.speakers.length > 1 && (
                    <button
                      className="text-zinc-600 hover:text-red-400 text-xs"
                      aria-label={`Remove ${sp.id}`}
                      onClick={() => s.removeSpeaker(sp.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button className="text-xs text-primary hover:underline" onClick={() => s.addSpeaker()}>
                + Add speaker
              </button>
            </div>
          </section>

          {/* Dialogue */}
          {p.dialogue_timeline.length > 0 && (
            <section>
              <span className="field-label">Dialogue Timeline (locked)</span>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {p.dialogue_timeline.map((d, i) => (
                  <div key={i} className="flex gap-2 text-xs bg-panel2 rounded-md px-2 py-1.5">
                    <span className="text-zinc-600 font-mono shrink-0">
                      {d.start.toFixed(1)}–{d.end.toFixed(1)}s
                    </span>
                    <span className="text-primary/80 shrink-0">
                      {s.speakers.find((x) => x.id === d.speaker_id)?.label ?? d.speaker_id}
                    </span>
                    <span className="text-zinc-300 truncate">{d.text}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Timeline tracks */}
          {tracks.length > 0 && (
            <section>
              <span className="field-label">Editing Timeline · {duration.toFixed(1)}s</span>
              <div className="space-y-1.5">
                {tracks.map((track) => (
                  <div key={track.type} className="flex items-center gap-2">
                    <span className="w-20 text-[10px] uppercase tracking-wide text-zinc-500 shrink-0 text-right">
                      {track.label}
                    </span>
                    <div className="relative flex-1 h-6 bg-panel2 rounded overflow-hidden">
                      {track.events.map((e) => (
                        <button
                          key={e.id}
                          title={`${e.id}: ${e.action ?? e.type} (${e.start}–${e.end}s)`}
                          aria-label={`Timeline event ${e.id}`}
                          onClick={() => setSelected(e.id === selected ? null : e.id)}
                          className={`absolute top-0.5 bottom-0.5 rounded ${track.color} ${
                            selected === e.id ? "ring-2 ring-white/80" : "hover:brightness-125"
                          }`}
                          style={{
                            left: `${(e.start / duration) * 100}%`,
                            width: `${Math.max(((e.end - e.start) / duration) * 100, 1.2)}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Selected event inspector */}
          {selectedEvent && (
            <section className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="font-mono text-primary">{selectedEvent.id}</span>
                <span className="text-zinc-500">
                  {selectedEvent.start.toFixed(2)}s – {selectedEvent.end.toFixed(2)}s
                </span>
              </div>
              <p className="text-zinc-300">
                <span className="text-zinc-500">Type:</span> {selectedEvent.type}
                {selectedEvent.action && <> · <span className="text-zinc-500">Action:</span> {selectedEvent.action}</>}
                {selectedEvent.sound_effect && <> · <span className="text-zinc-500">SFX:</span> {selectedEvent.sound_effect}</>}
              </p>
              {selectedEvent.intensity !== undefined && (
                <label className="block">
                  <span className="text-zinc-500">Intensity: {selectedEvent.intensity.toFixed(2)}</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedEvent.intensity}
                    className="w-full accent-violet-500"
                    onChange={(ev) =>
                      s.updateProject((proj) => {
                        const t = proj.timeline.find((x) => x.id === selectedEvent.id);
                        if (t) t.intensity = Number(ev.target.value);
                        return proj;
                      })
                    }
                  />
                </label>
              )}
              {selectedEvent.reason && (
                <p className="text-zinc-400 italic">Why: {selectedEvent.reason}</p>
              )}
              <button
                className="text-red-400 hover:underline"
                onClick={() => {
                  s.updateProject((proj) => {
                    proj.timeline = proj.timeline.filter((x) => x.id !== selectedEvent.id);
                    return proj;
                  });
                  setSelected(null);
                }}
              >
                Remove event
              </button>
            </section>
          )}

          {/* Semantic insights */}
          <section>
            <span className="field-label">Semantic Insights</span>
            {p.analysis?.semantic_insights?.length ? (
              <div className="space-y-1">
                {p.analysis.semantic_insights.map((si, i) => (
                  <div key={i} className="text-xs bg-panel2 rounded-md px-2 py-1.5">
                    <span className="font-mono text-zinc-600">
                      {si.start.toFixed(1)}–{si.end.toFixed(1)}s
                    </span>{" "}
                    <span className="text-zinc-300">{si.observation}</span>
                    <p className="text-primary/70 mt-0.5">→ {si.recommendation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-600">
                Deep semantic analysis (scenes, hooks, emphasis moments) runs when the
                AI backend is configured. Timeline events above show the rule-based plan
                with a semantic reason on every edit.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
