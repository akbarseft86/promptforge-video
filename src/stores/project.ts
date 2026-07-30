import { create } from "zustand";
import {
  UniversalVideoProject,
  Preset,
  Speaker,
  Character,
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
import { AutoFix, safeFixes } from "../features/validator/autofix";
import {
  loadCharacterLibrary,
  saveCharacterLibrary,
} from "../features/characters/library";
import {
  MediaService,
  TranscriptionService,
  VideoAnalysisService,
  AiError,
  VideoAnalysisResult,
} from "../services/aiProvider";

export type TranscriptMode = "manual" | "auto" | "none";

export interface PresetOverrides {
  editing?: Partial<Preset["editing"]>;
  sfxIntensity?: Preset["sound_design"]["intensity"];
  backgroundReplacement?: boolean;
}

/** Applies the user's in-place tweaks on top of a preset. */
export function applyOverrides(
  preset: Preset,
  o: PresetOverrides
): Preset {
  if (!o.editing && o.sfxIntensity === undefined && o.backgroundReplacement === undefined)
    return preset;
  return {
    ...preset,
    editing: { ...preset.editing, ...(o.editing ?? {}) },
    sound_design: {
      intensity: o.sfxIntensity ?? preset.sound_design.intensity,
    },
    background_replacement_default:
      o.backgroundReplacement ?? preset.background_replacement_default,
  };
}
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
  characters: Character[];
  characterLibrary: Character[];
  preservation: SpeakerPreservation;
  source: Source;
  videoObjectUrl: string | null;
  /** Kept out of persistence: needed to send the media to the API for analysis. */
  videoFile: File | null;
  /** Non-fatal note from the AI pass (fell back, truncated, estimated timings). */
  aiNotice: string | null;
  analysis: VideoAnalysisResult | null;
  platformTargets: UniversalVideoProject["output"]["platform_targets"];
  targetDurationSeconds: number;
  /** In-place tweaks to the selected preset; cleared by "Reset to preset defaults". */
  presetOverrides: PresetOverrides;

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
  basePreset: () => Preset;
  selectedPreset: () => Preset;
  addSpeaker: () => void;
  renameSpeaker: (id: string, label: string) => void;
  removeSpeaker: (id: string) => void;
  addCharacter: () => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  /** Persist a project character for reuse in other projects. */
  saveCharacterToLibrary: (id: string) => void;
  /** Copy a saved character into this project under a fresh id. */
  useCharacterFromLibrary: (libraryId: string) => void;
  deleteCharacterFromLibrary: (libraryId: string) => void;
  togglePreservation: (key: keyof SpeakerPreservation) => void;
  refreshRecommendation: () => void;
  runAiPass: (file: File) => Promise<void>;
  generate: () => Promise<void>;
  updateProject: (updater: (p: UniversalVideoProject) => UniversalVideoProject) => void;
  applyRawJson: (text: string) => void;
  runValidation: () => void;
  applyFix: (fix: AutoFix) => void;
  applyAllSafeFixes: () => number;
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
        characters: s.characters,
        selectedPresetId: s.selectedPresetId,
        targetDurationSeconds: s.targetDurationSeconds,
        presetOverrides: s.presetOverrides,
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
  transcriptMode: "manual",
  manualTranscript: "",
  autoTranscript: "",
  language: "",
  speakers: [{ id: "speaker_1", label: "Speaker 1" }],
  characters: [],
  characterLibrary: loadCharacterLibrary(),
  preservation: DEFAULT_PRESERVATION,
  source: DEFAULT_SOURCE,
  videoObjectUrl: null,
  videoFile: null,
  aiNotice: null,
  analysis: null,
  platformTargets: ["instagram_reels", "tiktok", "youtube_shorts"],
  targetDurationSeconds: 15,
  presetOverrides: {},

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

  /** The preset as chosen, before the user's in-place tweaks. */
  basePreset: () => {
    const all = get().allPresets();
    return all.find((p) => p.id === get().selectedPresetId) ?? BUILTIN_PRESETS[0];
  },

  /** What generation and the UI both read: preset + overrides. */
  selectedPreset: () => applyOverrides(get().basePreset(), get().presetOverrides),

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

  addCharacter: () => {
    const characters = get().characters;
    // Numbered off the highest existing id rather than the count, so deleting
    // a middle character cannot mint a duplicate id.
    const nextNum =
      characters.reduce(
        (max, c) => Math.max(max, Number(c.id.replace("character_", "")) || 0),
        0
      ) + 1;
    get().set({
      characters: [
        ...characters,
        {
          id: `character_${nextNum}`,
          name: `Character ${nextNum}`,
          appearance: "",
          lock_across_shots: true,
        },
      ],
    });
  },

  updateCharacter: (id, patch) =>
    get().set({
      characters: get().characters.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }),

  removeCharacter: (id) =>
    get().set({ characters: get().characters.filter((c) => c.id !== id) }),

  saveCharacterToLibrary: (id) => {
    const c = get().characters.find((x) => x.id === id);
    if (!c || !c.name.trim() || !c.appearance.trim()) return;
    // Keyed by name: saving the same character twice should update it rather
    // than leave two sheets that can drift apart.
    const others = get().characterLibrary.filter(
      (x) => x.name.trim().toLowerCase() !== c.name.trim().toLowerCase()
    );
    const next = [...others, { ...c }];
    saveCharacterLibrary(next);
    set({ characterLibrary: next });
  },

  useCharacterFromLibrary: (libraryId) => {
    const saved = get().characterLibrary.find((c) => c.id === libraryId);
    if (!saved) return;
    const characters = get().characters;
    const nextNum =
      characters.reduce(
        (max, c) => Math.max(max, Number(c.id.replace("character_", "")) || 0),
        0
      ) + 1;
    // A fresh project id, but every descriptive field copied verbatim — the
    // sheet has to come out identical to the one used in earlier clips.
    get().set({
      characters: [...characters, { ...saved, id: `character_${nextNum}` }],
    });
  },

  deleteCharacterFromLibrary: (libraryId) => {
    const next = get().characterLibrary.filter((c) => c.id !== libraryId);
    saveCharacterLibrary(next);
    set({ characterLibrary: next });
  },

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

  /**
   * Upload → transcribe → analyse. Every failure here is non-fatal: the note
   * is surfaced via `aiNotice` and generation proceeds deterministically, so
   * a gateway outage degrades the result instead of blocking it.
   */
  runAiPass: async (file: File) => {
    const notes: string[] = [];
    let uploadId: string | null = null;

    try {
      set({ processing: "uploading" });
      uploadId = await MediaService.upload(file);

      if (get().transcriptMode === "auto") {
        set({ processing: "extracting_audio" });
        set({ processing: "transcribing" });
        const t = await TranscriptionService.transcribe(uploadId);

        if (t && t.text.trim()) {
          set({ processing: "detecting_speakers" });
          set({
            autoTranscript: t.text,
            language: get().language || t.language || "",
            speakers: t.speakers.length ? t.speakers : get().speakers,
          });
          if (t.truncated) {
            notes.push("only the first 20 minutes of audio were transcribed");
          }
          if (t.timing_precision === "estimated") {
            notes.push(
              "caption timings are model-estimated, not forced-aligned — " +
                "use Manual Locked for word-exact captions"
            );
          }
        } else {
          notes.push("no intelligible speech was found in the audio");
        }
      }

      set({ processing: "analyzing_scenes" });
      const a = await VideoAnalysisService.analyze(uploadId);
      if (a) {
        set({ processing: "understanding_content", analysis: a });
        if (
          a.recommended_preset_id &&
          get().allPresets().some((p) => p.id === a.recommended_preset_id)
        ) {
          set({
            recommendedPresetId: a.recommended_preset_id,
            recommendationReason: "Recommended from the video's own content.",
          });
        }
      }
    } catch (err) {
      notes.push(
        err instanceof AiError
          ? err.message
          : `AI analysis unavailable (${err instanceof Error ? err.message : String(err)})`
      );
    } finally {
      if (uploadId) MediaService.discard(uploadId);
      if (notes.length) set({ aiNotice: notes.join("; ") });
    }
  },

  generate: async () => {
    const s = get();

    try {
      set({ processing: "idle", processingError: null, aiNotice: null });

      // The AI pass only earns its keep when there is media to look at. Without
      // it — or if any step fails — generation continues on the deterministic
      // local pipeline, which never depends on the gateway.
      if (s.source.media_type === "video" && s.videoFile) {
        await get().runAiPass(s.videoFile);
      }

      set({ processing: "building_timeline" });
      await new Promise((r) => setTimeout(r, 60));
      set({ processing: "generating_json" });

      // Re-read: the AI pass may have written the transcript, speakers and
      // language since `s` was captured.
      const cur = get();
      const project = generateUniversalProject({
        projectName: cur.projectName,
        instructions: cur.instructions,
        customStyle: cur.customStyle,
        preset: cur.selectedPreset(),
        transcriptMode: cur.transcriptMode,
        manualTranscript: cur.manualTranscript,
        autoTranscript: cur.autoTranscript,
        language: cur.language || undefined,
        speakers: cur.speakers,
        // A character with no appearance yet is a half-filled row in the UI,
        // not a subject. Passing it through would fail the schema and surface
        // as a validation error the user cannot act on.
        characters: cur.characters.filter(
          (c) => c.name.trim() && c.appearance.trim()
        ),
        preservation: cur.preservation,
        source: cur.source,
        platformTargets: cur.platformTargets,
        targetDurationSeconds: cur.targetDurationSeconds,
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

  /** Applies one repair, then re-validates so the list reflects the result. */
  applyFix: (fix) => {
    const current = get().project;
    if (!current) return;
    const next = fix.apply(structuredClone(current));
    set({
      project: next,
      rawJsonDraft: JSON.stringify(next, null, 2),
      rawJsonError: null,
      validation: validateProject(next),
    });
    persistInputs(get());
  },

  /**
   * Applies every non-lossy repair in one pass. Re-derives the fix list after
   * each step: a repair can resolve or reshape later findings.
   */
  applyAllSafeFixes: () => {
    let current = get().project;
    if (!current) return 0;
    let applied = 0;
    // Bounded so a fix that fails to clear its own finding cannot loop.
    for (let pass = 0; pass < 12; pass++) {
      const pending = safeFixes(validateProject(current), current);
      if (!pending.length) break;
      current = pending[0].apply(structuredClone(current));
      applied++;
    }
    if (!applied) return 0;
    set({
      project: current,
      rawJsonDraft: JSON.stringify(current, null, 2),
      rawJsonError: null,
      validation: validateProject(current),
    });
    persistInputs(get());
    return applied;
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
