import { UniversalVideoProject } from "../schemas/universal";
import { generateHumanPrompt } from "../services/humanPrompt";

export interface AdapterResult {
  format: "text" | "json";
  content: string;
  notes?: string;
}

export interface VideoPromptAdapter {
  id: string;
  name: string;
  transform(project: UniversalVideoProject): AdapterResult;
}

const universalAdapter: VideoPromptAdapter = {
  id: "universal",
  name: "Universal",
  transform: (p) => ({
    format: "json",
    content: JSON.stringify(p, null, 2),
  }),
};

function lockedDialogueBlock(p: UniversalVideoProject): string {
  if (p.transcript.source === "none" || !p.transcript.text.trim()) return "";
  return `\nLOCKED DIALOGUE (use word-for-word, never rewrite/translate/repeat/omit):\n"${p.transcript.text}"\n`;
}

const veoAdapter: VideoPromptAdapter = {
  id: "veo",
  name: "Veo",
  transform: (p) => ({
    format: "text",
    content:
      `# Veo edit prompt\n\n${generateHumanPrompt(p)}\n` +
      `\nStyle emphasis: photorealistic continuity with the source footage; respect all preservation locks.\n`,
    notes:
      "Veo responds best to dense cinematic natural language. Timeline timestamps are preserved as directions.",
  }),
};

const klingAdapter: VideoPromptAdapter = {
  id: "kling",
  name: "Kling",
  transform: (p) => ({
    format: "text",
    content:
      `# Kling edit prompt\n\nScene: ${p.visual_direction.environment ?? "as source"}\nStyle: ${p.visual_direction.style}\nAspect: ${p.output.aspect_ratio ?? "9:16"}\n${lockedDialogueBlock(p)}\n${generateHumanPrompt(p)}`,
    notes: "Kling prefers a short scene/style header before detailed directions.",
  }),
};

const runwayAdapter: VideoPromptAdapter = {
  id: "runway",
  name: "Runway",
  transform: (p) => ({
    format: "text",
    content:
      `# Runway (Gen) edit prompt\n\n${generateHumanPrompt(p)}\n\nCamera notes: ${p.timeline
        .filter((e) => e.type === "camera")
        .map((e) => `${e.action} @ ${e.start}s`)
        .join(", ") || "none"}\n`,
    notes: "Runway favors explicit camera directions; camera events are summarized separately.",
  }),
};

const soraAdapter: VideoPromptAdapter = {
  id: "sora",
  name: "Sora",
  transform: (p) => ({
    format: "text",
    content:
      `# Sora edit prompt\n\n${generateHumanPrompt(p)}\n` +
      `\nContinuity: maintain the source subject's identity, wardrobe, and voice per the preservation locks above.\n`,
    notes: "Sora accepts long-form natural language; constraints are stated inline.",
  }),
};

export const ADAPTERS: VideoPromptAdapter[] = [
  universalAdapter,
  veoAdapter,
  klingAdapter,
  runwayAdapter,
  soraAdapter,
];
