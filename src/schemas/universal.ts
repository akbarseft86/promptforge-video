import { z } from "zod";

/**
 * Universal Video Editing JSON — schema v1.0
 *
 * Fixed core schema + optional dynamic modules. Locked/factual fields
 * (transcript text, source metadata, speaker IDs, schema version) are
 * controlled deterministically by application code, never by AI output.
 */

export const SCHEMA_VERSION = "1.0";

// ---------- core ----------

export const ProjectInfoSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "short_form_social",
    "podcast_clip",
    "educational",
    "commercial",
    "ugc",
    "other",
  ]),
});

export const SourceSchema = z.object({
  media_type: z.enum(["video", "text_only"]),
  file_name: z.string().optional(),
  duration_seconds: z.number().nonnegative().optional(),
  aspect_ratio: z.string().optional(),
  resolution: z.string().optional(),
  fps: z.number().positive().optional(),
  size_bytes: z.number().nonnegative().optional(),
});

export const SpeakerSchema = z.object({
  id: z.string().regex(/^speaker_\d+$/),
  label: z.string().min(1),
});

export const TranscriptSchema = z.object({
  source: z.enum(["manual_locked", "auto_locked", "none"]),
  language: z.string().optional(),
  text: z.string(),
  preserve_exact_words: z.boolean(),
  allow_rewrite: z.boolean(),
  allow_autocorrect: z.boolean(),
  allow_translation: z.boolean(),
  allow_word_insertion: z.boolean(),
  allow_word_deletion: z.boolean(),
  allow_word_repetition: z.boolean(),
  audio_alignment_enabled: z.boolean(),
});

export const DialogueEntrySchema = z.object({
  speaker_id: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string(),
});

export const WordAlignmentSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  speaker_id: z.string(),
});

export const SpeakerPreservationSchema = z.object({
  identity: z.boolean(),
  voice: z.boolean(),
  lip_sync: z.boolean(),
  facial_expression: z.boolean(),
  body_language: z.boolean(),
  clothing: z.boolean(),
  original_colors: z.boolean(),
  body_proportions: z.boolean(),
  original_language: z.boolean(),
  camera_perspective: z.boolean(),
});

export const VisualDirectionSchema = z.object({
  style: z.string(),
  environment: z.string().optional(),
  cinematic_relighting: z.boolean(),
  background_replacement: z.boolean(),
  background_description: z.string().optional(),
  background_elements: z.array(z.string()).optional(),
  color_grading: z.string().optional(),
  preserve_skin_tones: z.boolean().optional(),
});

export const PacingSchema = z.enum([
  "relaxed",
  "standard",
  "high_retention",
  "fast",
]);

export const EditingSchema = z.object({
  pacing: PacingSchema,
  target_visual_change_interval_seconds: z
    .tuple([z.number().positive(), z.number().positive()])
    .optional(),
  auto_reframe: z.boolean(),
  punch_ins: z.boolean(),
  dynamic_zoom: z.boolean(),
  b_roll: z.boolean(),
  motion_graphics: z.boolean(),
  transitions: z.boolean(),
  speed_ramps: z.boolean(),
  color_grading: z.string().optional(),
});

export const AudioSchema = z.object({
  preserve_original_voice: z.boolean(),
  sound_design: z.boolean(),
  dialogue_priority: z.enum(["highest", "high", "normal"]),
  music_ducking: z.boolean(),
});

export const TimelineEventTypeSchema = z.enum([
  "camera",
  "kinetic_typography",
  "b_roll",
  "motion_graphics",
  "sound_effect",
  "transition",
  "caption_segment",
  "emphasis",
  "speed_ramp",
]);

export const TimelineEventSchema = z.object({
  id: z.string().min(1),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  type: TimelineEventTypeSchema,
  action: z.string().optional(),
  intensity: z.number().min(0).max(1).optional(),
  text_source: z.literal("locked_transcript").optional(),
  text: z.string().optional(),
  style: z.string().optional(),
  sound_effect: z.string().optional(),
  reason: z.string().optional(),
});

export const OutputSchema = z.object({
  content_type: z.string(),
  platform_targets: z.array(
    z.enum(["instagram_reels", "tiktok", "youtube_shorts", "youtube", "other"])
  ),
  aspect_ratio: z.string().optional(),
  target_duration_seconds: z.number().positive().optional(),
  style_quality: z.enum(["standard", "premium"]),
});

export const ConstraintsSchema = z.object({
  no_identity_change: z.boolean(),
  no_voice_change: z.boolean(),
  no_wardrobe_change: z.boolean(),
  no_dialogue_rewrite: z.boolean(),
  no_dialogue_repetition: z.boolean(),
  no_missing_dialogue: z.boolean(),
  no_translation: z.boolean(),
  no_caption_face_overlap: z.boolean(),
  no_future_dialogue: z.boolean(),
  no_source_distortion: z.boolean(),
  no_effect_overload: z.boolean(),
  no_lip_sync_change: z.boolean().optional(),
  no_body_proportion_change: z.boolean().optional(),
  no_keyword_substitution: z.boolean().optional(),
  no_added_dialogue: z.boolean().optional(),
  no_unreadable_text: z.boolean().optional(),
  no_lighting_artifacts: z.boolean().optional(),
  no_chaotic_edit: z.boolean().optional(),
});

// ---------- optional dynamic modules ----------

export const CaptionsSchema = z.object({
  enabled: z.boolean(),
  source: z.literal("locked_transcript"),
  word_for_word: z.boolean(),
  word_synchronized: z.boolean(),
  prevent_face_overlap: z.boolean(),
  allow_future_dialogue: z.boolean(),
  kinetic_typography: z.boolean(),
  style: z.string().optional(),
  position: z
    .enum(["behind_speaker", "beside_speaker", "lower_third", "centered", "auto"])
    .optional(),
  motion_tracked: z.boolean().optional(),
  depth_integration: z.boolean().optional(),
  segment_long_sentences: z.boolean().optional(),
  replace_on_progress: z.boolean().optional(),
  typography: z.string().optional(),
  animations: z.array(z.string()).optional(),
  highlight_colors: z.array(z.string()).optional(),
});

export const SoundDesignSchema = z.object({
  enabled: z.boolean(),
  intensity: z.enum(["low", "medium", "high"]),
  never_overpower_speech: z.literal(true),
  palette: z.array(z.string()).optional(),
});

export const BackgroundMusicSchema = z.object({
  enabled: z.boolean(),
  style: z.array(z.string()),
  dialogue_ducking: z.boolean(),
  dialogue_priority: z.enum(["highest", "high", "normal"]),
  description: z.string().optional(),
  energy: z.enum(["subtle", "moderate", "energetic"]).optional(),
});

export const VisualEffectsSchema = z.object({
  enabled: z.boolean(),
  effects: z.array(z.string()),
});

export const MotionGraphicsSchema = z.object({
  enabled: z.boolean(),
  elements: z.array(z.string()),
});

export const CameraMotionSchema = z.object({
  enabled: z.boolean(),
  moves: z.array(z.string()),
});

/**
 * Set when captions were requested but no locked transcript exists yet.
 * Downstream prompts must then instruct the video model to transcribe the
 * source audio itself rather than invent dialogue.
 */
export const TranscriptionRequirementSchema = z.object({
  required: z.literal(true),
  reason: z.string(),
  transcribe_from: z.literal("source_audio"),
  preserve_original_language: z.boolean(),
  preserve_filler_words: z.boolean(),
  preserve_repeated_words: z.boolean(),
  preserve_slang_and_dialect: z.boolean(),
  allow_grammar_correction: z.boolean(),
  verify_against_audio: z.boolean(),
  omit_unclear_audio: z.boolean(),
  sync_tolerance_seconds: z.number().positive(),
});

export const AnalysisSchema = z
  .object({
    scenes: z.number().optional(),
    speech_detected: z.boolean().optional(),
    speaker_count: z.number().optional(),
    transcript_confidence: z.number().min(0).max(1).optional(),
    orientation: z.string().optional(),
    quality: z.string().optional(),
    framing: z.string().optional(),
    semantic_insights: z
      .array(
        z.object({
          start: z.number(),
          end: z.number(),
          observation: z.string(),
          recommendation: z.string(),
        })
      )
      .optional(),
  })
  .optional();

// ---------- root ----------

export const UniversalVideoProjectSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  project: ProjectInfoSchema,
  source: SourceSchema,
  analysis: AnalysisSchema,
  speakers: z.array(SpeakerSchema),
  transcript: TranscriptSchema,
  dialogue_timeline: z.array(DialogueEntrySchema),
  word_alignment: z.array(WordAlignmentSchema).optional(),
  speaker_preservation: SpeakerPreservationSchema,
  visual_direction: VisualDirectionSchema,
  editing: EditingSchema,
  audio: AudioSchema,
  timeline: z.array(TimelineEventSchema),
  output: OutputSchema,
  constraints: ConstraintsSchema,
  // optional modules — include only when relevant
  captions: CaptionsSchema.optional(),
  sound_design: SoundDesignSchema.optional(),
  background_music: BackgroundMusicSchema.optional(),
  visual_effects: VisualEffectsSchema.optional(),
  motion_graphics: MotionGraphicsSchema.optional(),
  camera_motion: CameraMotionSchema.optional(),
  transcription_requirement: TranscriptionRequirementSchema.optional(),
});

export type UniversalVideoProject = z.infer<typeof UniversalVideoProjectSchema>;
export type ProjectInfo = z.infer<typeof ProjectInfoSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Speaker = z.infer<typeof SpeakerSchema>;
export type Transcript = z.infer<typeof TranscriptSchema>;
export type DialogueEntry = z.infer<typeof DialogueEntrySchema>;
export type WordAlignment = z.infer<typeof WordAlignmentSchema>;
export type SpeakerPreservation = z.infer<typeof SpeakerPreservationSchema>;
export type VisualDirection = z.infer<typeof VisualDirectionSchema>;
export type Editing = z.infer<typeof EditingSchema>;
export type AudioSettings = z.infer<typeof AudioSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type Output = z.infer<typeof OutputSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
export type Captions = z.infer<typeof CaptionsSchema>;
export type SoundDesign = z.infer<typeof SoundDesignSchema>;
export type BackgroundMusic = z.infer<typeof BackgroundMusicSchema>;
export type VisualEffects = z.infer<typeof VisualEffectsSchema>;
export type MotionGraphics = z.infer<typeof MotionGraphicsSchema>;
export type CameraMotion = z.infer<typeof CameraMotionSchema>;

// ---------- presets ----------

export const PresetSchema = z.object({
  preset_version: z.literal("1.0"),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  builtin: z.boolean().optional(),
  visual_style: z.string(),
  environment: z.string().optional(),
  editing: z.object({
    pacing: PacingSchema,
    punch_in_frequency: z.enum(["off", "low", "medium", "medium_high", "high"]),
    b_roll_frequency: z.enum(["off", "low", "medium", "high"]),
    typography_frequency: z.enum(["off", "low", "medium", "high"]),
    motion_graphics: z.boolean(),
    transitions: z.boolean(),
  }),
  sound_design: z.object({
    intensity: z.enum(["low", "medium", "high"]),
  }),
  music_styles: z.array(z.string()),
  caption_style: z.string(),
  // richer creative vocabulary — optional so older presets still import
  category: z.string().optional(),
  visual_effects: z.array(z.string()).optional(),
  motion_elements: z.array(z.string()).optional(),
  camera_moves: z.array(z.string()).optional(),
  background_elements: z.array(z.string()).optional(),
  sfx_palette: z.array(z.string()).optional(),
  highlight_colors: z.array(z.string()).optional(),
  caption_animations: z.array(z.string()).optional(),
  caption_position: z
    .enum(["behind_speaker", "beside_speaker", "lower_third", "centered", "auto"])
    .optional(),
  typography: z.string().optional(),
  color_grading: z.string().optional(),
  music_description: z.string().optional(),
  background_replacement_default: z.boolean().optional(),
});

export type Preset = z.infer<typeof PresetSchema>;
