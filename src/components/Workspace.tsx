import { useEffect, useState } from "react";
import InputPanel from "./InputPanel";
import TimelinePanel from "./TimelinePanel";
import EditorPanel from "./EditorPanel";
import { useProjectStore } from "../stores/project";
import { useLang } from "../i18n";

type MobileTab = "input" | "timeline" | "editor";

export default function Workspace() {
  const refreshRecommendation = useProjectStore((s) => s.refreshRecommendation);
  const [mobileTab, setMobileTab] = useState<MobileTab>("input");
  const { lang, setLang, t } = useLang();

  useEffect(() => {
    refreshRecommendation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Language applies to the interface only — the generated prompt stays
          English, which is what the video models are tuned on. */}
      <div className="flex justify-end mb-2">
        <div
          className="flex gap-1"
          role="group"
          aria-label="Interface language / Bahasa antarmuka"
        >
          {(
            [
              ["en", "EN"],
              ["id", "ID"],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={`tab-btn ${
                lang === code
                  ? "bg-primary/15 text-primary"
                  : "bg-panel2 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile/tablet tab switcher */}
      <div className="flex gap-1 mb-3 lg:hidden" role="tablist" aria-label="Workspace panels">
        {(
          [
            ["input", t("panel.input", "Input")],
            ["timeline", t("panel.timeline", "Timeline")],
            ["editor", t("panel.editor", "JSON / Editor")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={mobileTab === id}
            onClick={() => setMobileTab(id)}
            className={`tab-btn flex-1 ${
              mobileTab === id
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
