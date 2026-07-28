import { create } from "zustand";
import {
  UniversalVideoProject,
  Preset,
  Speaker,
  SpeakerPreservation,
  Source,
} from "../schemas/universal";
import {
  BUILTIN_PRESETS,
  loadCustomPresets,
  saveCustomPresets,
  recommendPreset,
} from "../features/presets/presets";
import {
  generateUniversalProject,
} from "../services/generation";
import {
  validateProject,
  ValidationResult,
} from "../features/validator/validate";

export type TranscriptMode = "manual" | "auto" | "none";
export type ProcessingState =
  | "idle"
  | "uploading"
  | "extracting_audio"
  | "analyzing_vocal"
  | "transcribing"
  | "detecting_speakers"
  | "analyzing_scenes"
  | "understanding_content"
  | "building_timeline"
  | "generating_json"
  | "validating"
  | "complete"
  | "error";

const DEFAULT_PRESERVATION: SpeakerPreservation = {
  identity: true,
  voice: true,
  lip_sync: true,
  facial_expression: true,
  body_language: true,
  clothing: true,
  original_colors: true,
  body_proportions: true,
  original_language: true,
  camera_perspective: false,
};

const DEFAULT_SOURCE: Source = { media_type: "text_only" };

interface ProjectState {
  // inputs
  projectName: string;
  instructions: string;
  customStyle: string;
  transcriptMode: TranscriptMode;
  manualTranscript: string;
  autoTranscript: string;
  language: string;
  speakers: Speaker[];
  preservation: SpeakerPreservation;
  source: Source;
  videoObjectUrl: string | null;
  platformTargets: UniversalVideoProject["output"]["platform_targets"];
  targetDurationSeconds: number;

  // presets
  customPresets: Preset[];
  selectedPresetId: string;
  recommendedPresetId: string | null;
  recommendationReason: string;

  // pipeline
  processing: ProcessingState;
  processingError: string | null;

  // canonical output — single source of truth shared by visual + raw editors
  project: UniversalVideoProject | null;
  rawJsonDraft: string;
  rawJsonError: string | null;
  validation: ValidationResult[] | null;

  // actions
  set: (patch: Partial<ProjectState>) => void;
  allPresets: () => Preset[];
  selectedPreset: () => Preset;
  addSpeaker: () => void;
  renameSpeaker: (id: string, label: string) => void;
  removeSpeaker: (id: string) => void;
  togglePreservation: (key: keyof SpeakerPreservation) => void;
  refreshRecommendation: () => void;
  generate: () => Promise<void>;
  updateProject: (updater: (p: UniversalVideoProject) => UniversalVideoProject) => void;
  applyRawJson: (text: string) => void;
  runValidation: () => void;
  saveCustomPreset: (preset: Preset) => void;
  deleteCustomPreset: (id: string) => void;
  clearLocalData: () => void;
}

const PROJECT_KEY = "pfv.last_project.v1";
const INPUTS_KEY = "pfv.inputs.v1";

function persistInputs(s: ProjectState) {
  try {
    localStorage.setItem(
      INPUTS_KEY,
      JSON.stringify({
        projectName: s.projectName,
        instructions: s.instructions,
        customStyle: s.customStyle,
        transcriptMode: s.transcriptMode,
        manualTranscript: s.manualTranscript,
        language: s.language,
        selectedPresetId: s.selectedPresetId,
        targetDurationSeconds: s.targetDurationSeconds,
      })
    );
    if (s.project)
      localStorage.setItem(PROJECT_KEY, JSON.stringify(s.project));
  } catch {
    /* storage may be unavailable */
  }
}

function loadPersisted(): Partial<ProjectState> {
  try {
    const inputs = JSON.parse(localStorage.getItem(INPUTS_KEY) ?? "{}");
    const project = JSON.parse(localStorage.getItem(PROJECT_KEY) ?? "null");
    return {
      ...inputs,
      project: project ?? null,
      rawJsonDraft: project ? JSON.stringify(project, null, 2) : "",
    };
  } catch {
    return {};
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectName: "Creator Reel",
  instructions: "",
  customStyle: "",
  transcriptMode: "auto",
  manualTranscript: "",
  autoTranscript: "",
  language: "",
  speakers: [{ id: "speaker_1", label: "Speaker 1" }],
  preservation: DEFAULT_PRESERVATION,
  source: DEFAULT_SOURCE,
  videoObjectUrl: null,
  platformTargets: ["instagram_reels", "tiktok", "youtube_shorts"],
  targetDurationSeconds: 15,

  customPresets: loadCustomPresets(),
  selectedPresetId: "cinematic_creator",
  recommendedPresetId: null,
  recommendationReason: "",

  processing: "idle",
  processingError: null,

  project: null,
  rawJsonDraft: "",
  rawJsonError: null,
  validation: null,

  ...loadPersisted(),

  set: (patch) => {
    set(patch as ProjectState);
    persistInputs(get());
  },

  allPresets: () => [...BUILTIN_PRESETS, ...get().customPresets],

  selectedPreset: () => {
    const all = get().allPresets();
    return all.find((p) => p.id === get().selectedPresetId) ?? BUILTIN_PRESETS[0];
  },

  addSpeaker: () => {
    const speakers = get().speakers;
    const nextNum = speakers.length + 1;
    set({
      speakers: [
        ...speakers,
        { id: `speaker_${nextNum}`, label: `Speaker ${nextNum}` },
      ],
    });
  },

  renameSpeaker: (id, label) =>
    set({
      speakers: get().speakers.map((s) => (s.id === id ? { ...s, label } : s)),
    }),

  removeSpeaker: (id) => {
    const speakers = get().speakers.filter((s) => s.id !== id);
    if (speakers.length === 0) return;
    set({ speakers });
  },

  togglePreservation: (key) =>
    set({
      preservation: {
        ...get().preservation,
        [key]: !get().preservation[key],
      },
    }),

  refreshRecommendation: () => {
    const s = get();
    const rec = recommendPreset({
      instructions: `${s.instructions} ${s.customStyle}`,
      hasVideo: s.source.media_type === "video",
      speakerCount: s.speakers.length,
      durationSeconds: s.source.duration_seconds,
    });
    set({
      recommendedPresetId: rec.presetId,
      recommendationReason: rec.reason,
    });
  },

  generate: async () => {
    const s = get();
    const steps: ProcessingState[] =
      s.source.media_type === "video"
        ? [
            "extracting_audio",
            "analyzing_vocal",
            "transcribing",
            "detecting_speakers",
            "analyzing_scenes",
            "understanding_content",
            "building_timeline",
            "generating_json",
            "validating",
          ]
        : ["understanding_content", "building_timeline", "generating_json", "validating"];

    try {
      for (const step of steps.slice(0, -2)) {
        set({ processing: step, processingError: null });
        await new Promise((r) => setTimeout(r, 120));
      }
      set({ processing: "generating_json" });

      const project = generateUniversalProject({
        projectName: s.projectName,
        instructions: s.instructions,
        customStyle: s.customStyle,
        preset: get().selectedPreset(),
        transcriptMode: s.transcriptMode,
        manualTranscript: s.manualTranscript,
        autoTranscript: s.autoTranscript,
        language: s.language || undefined,
        speakers: s.speakers,
        preservation: s.preservation,
        source: s.source,
        platformTargets: s.platformTargets,
        targetDurationSeconds: s.targetDurationSeconds,
      });

      set({ processing: "validating" });
      const validation = validateProject(project);

      set({
        project,
        rawJsonDraft: JSON.stringify(project, null, 2),
        rawJsonError: null,
        validation,
        processing: "complete",
      });
      persistInputs(get());
    } catch (err) {
      set({
        processing: "error",
        processingError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  updateProject: (updater) => {
    const current = get().project;
    if (!current) return;
    const next = updater(structuredClone(current));
    set({
      project: next,
      rawJsonDraft: JSON.stringify(next, null, 2),
      rawJsonError: null,
    });
    persistInputs(get());
  },

  applyRawJson: (text) => {
    set({ rawJsonDraft: text });
    try {
      const parsed = JSON.parse(text);
      set({ project: parsed, rawJsonError: null });
      persistInputs(get());
    } catch (err) {
      set({
        rawJsonError:
          err instanceof Error ? err.message : "Invalid JSON",
      });
    }
  },

  runValidation: () => {
    const s = get();
    if (s.rawJsonError) {
      set({
        validation: [
          {
            severity: "ERROR",
            title: "Invalid JSON",
            detail: s.rawJsonError,
          },
        ],
      });
      return;
    }
    if (!s.project) return;
    set({ validation: validateProject(s.project) });
  },

  saveCustomPreset: (preset) => {
    const others = get().customPresets.filter((p) => p.id !== preset.id);
    const next = [...others, { ...preset, builtin: false }];
    saveCustomPresets(next);
    set({ customPresets: next });
  },

  deleteCustomPreset: (id) => {
    const next = get().customPresets.filter((p) => p.id !== id);
    saveCustomPresets(next);
    set({ customPresets: next, selectedPresetId: get().selectedPresetId === id ? "cinematic_creator" : get().selectedPresetId });
  },

  clearLocalData: () => {
    localStorage.removeItem(PROJECT_KEY);
    localStorage.removeItem(INPUTS_KEY);
    localStorage.removeItem("pfv.custom_presets.v1");
    set({
      project: null,
      rawJsonDraft: "",
      validation: null,
      customPresets: [],
      instructions: "",
      customStyle: "",
      manualTranscript: "",
    });
  },
}));
