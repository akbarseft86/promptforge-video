import { useEffect, useState } from "react";
import { useProjectStore } from "../stores/project";
import { ServerHealth } from "../services/aiProvider";

const MODEL_KEYS = [
  ["TRANSCRIPTION_MODEL", "whisper-large-v3"],
  ["VIDEO_ANALYSIS_MODEL", "gemini-2.5-pro"],
  ["REASONING_MODEL", "claude-sonnet-5"],
  ["JSON_GENERATION_MODEL", "claude-sonnet-5"],
  ["VALIDATION_MODEL", "claude-haiku-4-5"],
] as const;

const PREFS_KEY = "pfv.model_prefs.v1";

export default function Settings() {
  const s = useProjectStore();
  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const [prefs, setPrefs] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    } catch {
      return {};
    }
  });
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    ServerHealth.check().then(setServerUp);
  }, []);

  const setPref = (key: string, value: string) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-white">Settings</h2>

      <div className="panel p-4 space-y-2">
        <h3 className="text-sm font-semibold text-zinc-200">AI Backend</h3>
        <p className="text-xs text-zinc-500">
          Status:{" "}
          {serverUp === null ? (
            "checking…"
          ) : serverUp ? (
            <span className="text-emerald-400">connected</span>
          ) : (
            <span className="text-amber-400">
              not running — transcription and semantic analysis are unavailable;
              generation falls back to the deterministic local pipeline. Start it with{" "}
              <code className="font-mono bg-panel2 px-1 rounded">npm run server</code>{" "}
              and set <code className="font-mono bg-panel2 px-1 rounded">NINEROUTER_API_KEY</code>.
            </span>
          )}
        </p>
        <p className="text-[11px] text-zinc-600">
          AI gateway keys are only ever read server-side; they are never exposed to the browser.
        </p>
      </div>

      <div className="panel p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200">Model Preferences</h3>
        <p className="text-[11px] text-zinc-600">
          Centralized per-task model configuration, sent to the server with each request.
        </p>
        {MODEL_KEYS.map(([key, def]) => (
          <div key={key}>
            <label className="field-label" htmlFor={key}>
              {key}
            </label>
            <input
              id={key}
              className="text-input font-mono text-xs"
              value={prefs[key] ?? def}
              onChange={(e) => setPref(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="panel p-4 space-y-2">
        <h3 className="text-sm font-semibold text-zinc-200">Local Data</h3>
        <p className="text-[11px] text-zinc-600">
          Projects, drafts, and custom presets are stored only in this browser.
          Uploaded videos are processed temporarily and never persisted.
        </p>
        <button
          className="btn-ghost text-xs text-red-400 border-red-500/30 hover:border-red-500/60"
          onClick={() => {
            s.clearLocalData();
            setCleared(true);
            setTimeout(() => setCleared(false), 2000);
          }}
        >
          {cleared ? "✓ Cleared" : "Clear Local Data"}
        </button>
      </div>
    </div>
  );
}
