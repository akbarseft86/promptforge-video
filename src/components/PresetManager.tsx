import { useRef, useState } from "react";
import { useProjectStore } from "../stores/project";
import { Preset } from "../schemas/universal";
import { validateImportedPreset } from "../features/presets/presets";

export default function PresetManager() {
  const s = useProjectStore();
  const [editing, setEditing] = useState<Preset | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const fileRef = useRef<HTMLInputElement>(null);
  const all = s.allPresets();

  const groupOf = (p: Preset) =>
    p.builtin === false ? "Custom" : (p.category ?? "Other");
  const categories = ["All", ...new Set(all.map(groupOf))];

  const q = query.trim().toLowerCase();
  const presets = all.filter(
    (p) =>
      (category === "All" || groupOf(p) === category) &&
      (!q ||
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        p.visual_style.toLowerCase().includes(q))
  );

  const duplicate = (p: Preset) => {
    const copy: Preset = {
      ...structuredClone(p),
      id: `${p.id}_copy_${Date.now().toString(36)}`,
      name: `${p.name} (copy)`,
      builtin: false,
    };
    s.saveCustomPreset(copy);
  };

  const exportPreset = (p: Preset) => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${p.id}.preset.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importPreset = async (file: File) => {
    setImportError(null);
    try {
      const json = JSON.parse(await file.text());
      const result = validateImportedPreset(json);
      if (!result.ok) {
        setImportError(`Invalid preset: ${result.error}`);
        return;
      }
      s.saveCustomPreset(result.preset);
    } catch {
      setImportError("File is not valid JSON.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Preset Manager{" "}
          <span className="text-xs font-normal text-zinc-500">
            {presets.length} of {all.length}
          </span>
        </h2>
        <div className="flex gap-2">
          <button className="btn-ghost text-xs" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importPreset(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {importError && (
        <p className="text-xs text-red-400" role="alert">
          {importError}
        </p>
      )}

      <div className="space-y-2">
        <input
          className="text-input"
          placeholder="Search presets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search presets"
        />
        <div className="flex gap-1 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`tab-btn ${
                category === cat
                  ? "bg-primary/15 text-primary"
                  : "bg-panel2 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {presets.map((p) => (
          <div key={p.id} className="panel p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">{p.description}</p>
              </div>
              {p.builtin ? (
                <span className="chip bg-gold/10 text-gold border border-gold/30 shrink-0">built-in</span>
              ) : (
                <span className="chip bg-primary/10 text-primary border border-primary/30 shrink-0">custom</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-600 font-mono">
              pacing: {p.editing.pacing} · punch-in: {p.editing.punch_in_frequency} · b-roll:{" "}
              {p.editing.b_roll_frequency} · typo: {p.editing.typography_frequency}
            </p>
            <div className="flex gap-2 flex-wrap text-xs">
              <button className="text-primary hover:underline" onClick={() => duplicate(p)}>
                Duplicate
              </button>
              <button className="text-zinc-400 hover:underline" onClick={() => exportPreset(p)}>
                Export
              </button>
              {!p.builtin && (
                <>
                  <button className="text-zinc-400 hover:underline" onClick={() => setEditing(structuredClone(p))}>
                    Edit
                  </button>
                  <button
                    className="text-red-400 hover:underline"
                    onClick={() => s.deleteCustomPreset(p.id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="panel p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Edit Preset</h3>
          <label className="field-label">Name</label>
          <input
            className="text-input"
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          />
          <label className="field-label">Visual style</label>
          <input
            className="text-input"
            value={editing.visual_style}
            onChange={(e) => setEditing({ ...editing, visual_style: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["pacing", ["relaxed", "standard", "high_retention", "fast"]],
                ["punch_in_frequency", ["off", "low", "medium", "medium_high", "high"]],
                ["b_roll_frequency", ["off", "low", "medium", "high"]],
                ["typography_frequency", ["off", "low", "medium", "high"]],
              ] as const
            ).map(([key, options]) => (
              <div key={key}>
                <label className="field-label">{key.replace(/_/g, " ")}</label>
                <select
                  className="text-input"
                  value={editing.editing[key]}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      editing: { ...editing.editing, [key]: e.target.value },
                    })
                  }
                >
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <label className="field-label">Music styles (comma-separated)</label>
          <input
            className="text-input"
            value={editing.music_styles.join(", ")}
            onChange={(e) =>
              setEditing({
                ...editing,
                music_styles: e.target.value.split(",").map((x) => x.trim()).filter(Boolean),
              })
            }
          />
          <div className="flex gap-2">
            <button
              className="btn-primary text-xs"
              onClick={() => {
                s.saveCustomPreset(editing);
                setEditing(null);
              }}
            >
              Save
            </button>
            <button className="btn-ghost text-xs" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
