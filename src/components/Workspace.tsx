import { useEffect, useState } from "react";
import InputPanel from "./InputPanel";
import TimelinePanel from "./TimelinePanel";
import EditorPanel from "./EditorPanel";
import { useProjectStore } from "../stores/project";

type MobileTab = "input" | "timeline" | "editor";

export default function Workspace() {
  const refreshRecommendation = useProjectStore((s) => s.refreshRecommendation);
  const [mobileTab, setMobileTab] = useState<MobileTab>("input");

  useEffect(() => {
    refreshRecommendation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Mobile/tablet tab switcher */}
      <div className="flex gap-1 mb-3 lg:hidden" role="tablist" aria-label="Workspace panels">
        {(
          [
            ["input", "Input"],
            ["timeline", "Timeline"],
            ["editor", "JSON / Editor"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={mobileTab === t}
            onClick={() => setMobileTab(t)}
            className={`tab-btn flex-1 ${
              mobileTab === t
                ? "bg-primary/15 text-primary"
                : "bg-panel2 text-zinc-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(280px,340px)_1fr_minmax(320px,420px)] items-start">
        <div className={mobileTab === "input" ? "" : "hidden lg:block"}>
          <InputPanel />
        </div>
        <div className={mobileTab === "timeline" ? "" : "hidden lg:block"}>
          <TimelinePanel />
        </div>
        <div className={mobileTab === "editor" ? "" : "hidden lg:block"}>
          <EditorPanel />
        </div>
      </div>
    </div>
  );
}
