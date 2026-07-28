import {
  SCHEMA_VERSION,
  UniversalVideoProject,
  Preset,
  Speaker,
  TimelineEvent,
  DialogueEntry,
} from "../schemas/universal";

/**
 * Deterministic generation layer.
 *
 * Creative fields (typography, pacing, B-roll, camera, SFX) may later be
 * produced by the AI service layer; locked fields (transcript text, source
 * metadata, speaker IDs, schema version, preservation locks) are ALWAYS
 * injected here by code, never by a model.
 */

export interface GenerationInput {
  projectName: string;
  instructions: string;
  customStyle: string;
  preset: Preset;
  transcriptMode: "manual" | "auto" | "none";
  manualTranscript: string;
  autoTranscript: string; // filled by transcription service when available
  language?: string;
  speakers: Speaker[];
  preservation: UniversalVideoProject["speaker_preservation"];
  source: UniversalVideoProject["source"];
  platformTargets: UniversalVideoProject["output"]["platform_targets"];
}

const FREQ_INTERVALS: Record<string, number> = {
  off: Infinity,
  low: 12,
  medium: 6,
  medium_high: 4,
  high: 3,
};

function detectFlags(text: string) {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  return {
    captions: has("caption", "subtitle", "word-for-word", "word for word"),
    noCaptions: has("no captions", "without captions"),
    bRoll: has("b-roll", "broll", "b roll"),
    punchIn: has("punch-in", "punch in", "zoom"),
    typography: has("typography", "kinetic", "animated text", "text animation"),
    sfx: has("sound effect", "sfx", "sound design"),
    music: has("music", "soundtrack"),
    motionGraphics: has("motion graphic", "overlay", "ui graphic", "3d icon"),
    backgroundReplace: has(
      "background replace",
      "replace the background",
      "luxury studio",
      "new background",
      "change the background"
    ),
    keepBackground: has(
      "keep the background",
      "keep background",
      "same background",
      "original background",
      "don't change the background",
      "do not change the background",
      "no background change"
    ),
    relighting: has("relight", "cinematic lighting", "relighting"),
    keepPerson: has(
      "keep the person",
      "keep the speaker",
      "exactly the same",
      "don't change the person",
      "preserve"
    ),
    minimalCaptions: has("captions minimal", "minimal captions"),
  };
}

let eventCounter = 0;
function evt(partial: Omit<TimelineEvent, "id">): TimelineEvent {
  eventCounter += 1;
  return { id: `event_${String(eventCounter).padStart(3, "0")}`, ...partial };
}

function buildTimeline(
  duration: number,
  preset: Preset,
  flags: ReturnType<typeof detectFlags>,
  sfxEnabled: boolean,
  hasLockedText: boolean
): TimelineEvent[] {
  eventCounter = 0;
  const events: TimelineEvent[] = [];
  if (!duration || duration <= 0) return events;

  const hookEnd = Math.min(2.4, duration);
  events.push(
    evt({
      start: 0,
      end: hookEnd,
      type: "camera",
      action: "punch_in",
      intensity: 0.35,
      reason: "Opening hook emphasis",
    })
  );
  if (sfxEnabled) {
    events.push(
      evt({
        start: 0,
        end: Math.min(0.6, duration),
        type: "sound_effect",
        sound_effect: "whoosh",
        intensity: 0.35,
        reason: "Hook entrance accent",
      })
    );
  }

  const punchEvery = FREQ_INTERVALS[preset.editing.punch_in_frequency];
  const brollEvery = FREQ_INTERVALS[preset.editing.b_roll_frequency];
  const typoEvery = FREQ_INTERVALS[preset.editing.typography_frequency];

  const addRepeating = (
    every: number,
    make: (start: number, end: number) => TimelineEvent
  ) => {
    if (!isFinite(every)) return;
    for (let t = every; t < duration - 0.5; t += every) {
      const end = Math.min(t + Math.min(every * 0.6, 2.5), duration);
      events.push(make(t, end));
    }
  };

  if (flags.punchIn || preset.editing.punch_in_frequency !== "off") {
    addRepeating(punchEvery, (s, e) =>
      evt({
        start: s,
        end: e,
        type: "camera",
        action: "punch_in",
        intensity: 0.3,
        reason: "Maintain visual momentum on key beat",
      })
    );
  }
  if (flags.bRoll || preset.editing.b_roll_frequency !== "off") {
    addRepeating(brollEvery, (s, e) =>
      evt({
        start: s,
        end: e,
        type: "b_roll",
        action: "conceptual_b_roll",
        reason: "Illustrate the concept being discussed",
      })
    );
  }
  // Typography events quote the locked transcript, so they only exist when
  // there is locked text to quote.
  if (
    hasLockedText &&
    (flags.typography || preset.editing.typography_frequency !== "off")
  ) {
    addRepeating(typoEvery, (s, e) =>
      evt({
        start: s,
        end: e,
        type: "kinetic_typography",
        text_source: "locked_transcript",
        style: preset.caption_style,
        reason: "Emphasize dialogue segment with synchronized typography",
      })
    );
  }

  // Closing emphasis
  if (duration > 4) {
    events.push(
      evt({
        start: Math.max(0, duration - 2),
        end: duration,
        type: "emphasis",
        action: "conclusion_emphasis",
        reason: "Strong conclusion — emphasis animation",
      })
    );
    if (sfxEnabled) {
      events.push(
        evt({
          start: Math.max(0, duration - 2),
          end: Math.max(0, duration - 1.4),
          type: "sound_effect",
          sound_effect: "deep_impact",
          intensity: 0.4,
          reason: "Impact sound on conclusion",
        })
      );
    }
  }

  return events.sort((a, b) => a.start - b.start);
}

/** Split a locked transcript into dialogue timeline entries without altering a single word. */
export function segmentLockedTranscript(
  text: string,
  duration: number,
  speakers: Speaker[]
): DialogueEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Segment on commas/periods for display timing; join of segments must equal original.
  const parts = trimmed
    .split(/(?<=[,.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const totalChars = parts.reduce((a, p) => a + p.length, 0) || 1;
  const usable = duration > 0 ? duration : Math.max(4, totalChars / 12);
  const speakerId = speakers[0]?.id ?? "speaker_1";
  let cursor = 0;
  return parts.map((p) => {
    const span = (p.length / totalChars) * usable;
    const entry: DialogueEntry = {
      speaker_id: speakerId,
      start: Number(cursor.toFixed(2)),
      end: Number(Math.min(cursor + span, usable).toFixed(2)),
      text: p,
    };
    cursor += span;
    return entry;
  });
}

export function generateUniversalProject(
  input: GenerationInput
): UniversalVideoProject {
  const flags = detectFlags(`${input.instructions} ${input.customStyle}`);
  const preset = input.preset;

  const lockedText =
    input.transcriptMode === "manual"
      ? input.manualTranscript
      : input.transcriptMode === "auto"
        ? input.autoTranscript
        : "";

  const transcriptSource =
    input.transcriptMode === "manual"
      ? "manual_locked"
      : input.transcriptMode === "auto" && lockedText
        ? "auto_locked"
        : "none";

  const duration = input.source.duration_seconds ?? 0;
  // Captions transcribe a locked source verbatim, so they require one to
  // exist. Enabling them from the instructions alone would emit a
  // "word-for-word from the locked transcript" directive with no words
  // behind it, forcing the downstream video model to invent the dialogue.
  const hasLockedText = lockedText.trim().length > 0;
  const captionsEnabled = !flags.noCaptions && hasLockedText;
  const captionsRequestedButUnavailable =
    !flags.noCaptions && flags.captions && !hasLockedText;
  const sfxEnabled = flags.sfx || preset.sound_design.intensity !== "low";
  const musicEnabled = flags.music || preset.music_styles.length > 0;

  // An explicit "keep the background" always wins over the preset default.
  const backgroundReplacement = flags.keepBackground
    ? false
    : flags.backgroundReplace || (preset.background_replacement_default ?? false);

  const project: UniversalVideoProject = {
    schema_version: SCHEMA_VERSION,
    project: {
      name: input.projectName || "Untitled Project",
      type: "short_form_social",
    },
    source: input.source,
    speakers: input.speakers,
    transcript: {
      source: transcriptSource,
      language: input.language,
      text: lockedText,
      preserve_exact_words: true,
      allow_rewrite: false,
      allow_autocorrect: false,
      allow_translation: false,
      allow_word_insertion: false,
      allow_word_deletion: false,
      allow_word_repetition: false,
      audio_alignment_enabled: input.source.media_type === "video",
    },
    dialogue_timeline: segmentLockedTranscript(
      lockedText,
      duration,
      input.speakers
    ),
    speaker_preservation: input.preservation,
    visual_direction: {
      style:
        input.customStyle.trim().length > 0
          ? `${preset.visual_style} + custom: ${input.customStyle.trim()}`
          : preset.visual_style,
      environment: preset.environment,
      cinematic_relighting:
        flags.relighting || backgroundReplacement || preset.id === "cinematic_creator",
      background_replacement: backgroundReplacement,
      background_description: backgroundReplacement
        ? preset.environment ?? "a premium studio environment"
        : undefined,
      background_elements: backgroundReplacement
        ? preset.background_elements
        : undefined,
      color_grading: preset.color_grading,
      preserve_skin_tones: true,
    },
    editing: {
      pacing: preset.editing.pacing,
      target_visual_change_interval_seconds:
        preset.editing.pacing === "fast"
          ? [1.5, 2.5]
          : preset.editing.pacing === "high_retention"
            ? [2, 3]
            : [3, 5],
      auto_reframe: true,
      punch_ins: preset.editing.punch_in_frequency !== "off" || flags.punchIn,
      dynamic_zoom: preset.editing.punch_in_frequency !== "off",
      b_roll: preset.editing.b_roll_frequency !== "off" || flags.bRoll,
      motion_graphics: preset.editing.motion_graphics || flags.motionGraphics,
      transitions: preset.editing.transitions,
      speed_ramps: preset.editing.pacing === "fast",
    },
    audio: {
      preserve_original_voice: input.preservation.voice,
      sound_design: sfxEnabled,
      dialogue_priority: "highest",
      music_ducking: musicEnabled,
    },
    timeline: buildTimeline(duration, preset, flags, sfxEnabled, hasLockedText),
    output: {
      content_type: "social_short",
      platform_targets: input.platformTargets,
      aspect_ratio: input.source.aspect_ratio ?? "9:16",
      style_quality: "premium",
    },
    constraints: {
      no_identity_change: input.preservation.identity,
      no_voice_change: input.preservation.voice,
      no_wardrobe_change: input.preservation.clothing,
      no_dialogue_rewrite: true,
      no_dialogue_repetition: true,
      no_missing_dialogue: true,
      no_translation: true,
      no_caption_face_overlap: captionsEnabled,
      no_future_dialogue: captionsEnabled,
      no_source_distortion: true,
      no_effect_overload: true,
      no_lip_sync_change: input.preservation.lip_sync,
      no_body_proportion_change: input.preservation.body_proportions,
      no_keyword_substitution: true,
      no_added_dialogue: true,
      no_unreadable_text: captionsEnabled,
      no_lighting_artifacts: true,
      no_chaotic_edit: true,
    },
  };

  if (captionsEnabled) {
    const kinetic =
      !flags.minimalCaptions && preset.editing.typography_frequency !== "off";
    project.captions = {
      enabled: true,
      source: "locked_transcript",
      word_for_word: true,
      word_synchronized: true,
      prevent_face_overlap: true,
      allow_future_dialogue: false,
      kinetic_typography: kinetic,
      style: flags.minimalCaptions ? "minimal" : preset.caption_style,
      position: preset.caption_position ?? "beside_speaker",
      motion_tracked: kinetic && backgroundReplacement,
      depth_integration: kinetic,
      segment_long_sentences: true,
      replace_on_progress: true,
      typography: preset.typography ?? "bold modern sans-serif typography",
      animations: kinetic ? preset.caption_animations : ["fade"],
      highlight_colors: flags.minimalCaptions ? undefined : preset.highlight_colors,
    };
  }
  if (sfxEnabled) {
    project.sound_design = {
      enabled: true,
      intensity: preset.sound_design.intensity,
      never_overpower_speech: true,
      palette: preset.sfx_palette?.length
        ? preset.sfx_palette
        : ["whoosh", "impact", "riser", "pop"],
    };
  }
  if (musicEnabled) {
    project.background_music = {
      enabled: true,
      style: preset.music_styles,
      dialogue_ducking: true,
      dialogue_priority: "highest",
      description: preset.music_description,
      energy:
        preset.editing.pacing === "fast"
          ? "energetic"
          : preset.editing.pacing === "relaxed"
            ? "subtle"
            : "moderate",
    };
  }
  if (captionsRequestedButUnavailable) {
    project.transcription_requirement = {
      required: true,
      reason:
        "Captions were requested but no transcript has been locked yet, so the dialogue is not known at prompt-generation time.",
      transcribe_from: "source_audio",
      preserve_original_language: true,
      preserve_filler_words: true,
      preserve_repeated_words: true,
      preserve_slang_and_dialect: true,
      allow_grammar_correction: false,
      verify_against_audio: true,
      omit_unclear_audio: true,
      sync_tolerance_seconds: 0.1,
    };
  }
  if (preset.visual_effects?.length) {
    project.visual_effects = { enabled: true, effects: preset.visual_effects };
  }
  if (project.editing.motion_graphics && preset.motion_elements?.length) {
    project.motion_graphics = { enabled: true, elements: preset.motion_elements };
  }
  if (preset.camera_moves?.length) {
    project.camera_motion = { enabled: true, moves: preset.camera_moves };
  }

  return project;
}
