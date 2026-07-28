import { useState } from "react";
import Workspace from "./components/Workspace";
import PresetManager from "./components/PresetManager";
import Settings from "./components/Settings";

type Page = "workspace" | "presets" | "settings";

export default function App() {
  const [page, setPage] = useState<Page>("workspace");

  const navBtn = (p: Page, label: string) => (
    <button
      key={p}
      onClick={() => setPage(p)}
      className={`tab-btn ${
        page === p
          ? "bg-primary/15 text-primary"
          : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-panel/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-indigo2 flex items-center justify-center text-white font-bold text-sm shrink-0">
              PF
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white leading-tight truncate">
                PromptForge Video
              </h1>
              <p className="text-[11px] text-zinc-500 leading-tight hidden sm:block">
                Turn any video idea into structured AI editing instructions
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {navBtn("workspace", "Workspace")}
            {navBtn("presets", "Presets")}
            {navBtn("settings", "Settings")}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4">
        {page === "workspace" && <Workspace />}
        {page === "presets" && <PresetManager />}
        {page === "settings" && <Settings />}
      </main>
    </div>
  );
}
