/**
 * Phrase vocabulary — maps machine-readable JSON values to the polished
 * production language used in the human-readable prompt.
 *
 * Every phrase here is only ever emitted when the corresponding field is
 * actually present/enabled in the Universal JSON, so the prompt never
 * introduces a requirement the JSON does not contain.
 */

export const PRESERVATION_PHRASES: Record<string, string> = {
  identity: "original face",
  voice: "original voice",
  lip_sync: "original lip sync",
  facial_expression: "original facial expressions",
  body_language: "original body language",
  clothing: "original clothing",
  original_colors: "original colors",
  body_proportions: "original body proportions",
  original_language: "original spoken language",
  camera_perspective: "original camera perspective",
};

export const EDITING_PHRASES: Record<string, string> = {
  dynamic_zoom: "Dynamic zoom-ins.",
  punch_ins: "Punch-ins.",
  auto_reframe: "Intelligent auto reframing.",
  transitions: "Smooth cinematic transitions.",
  speed_ramps: "Speed ramps.",
  b_roll: "Conceptual B-roll that supports the spoken content.",
  motion_graphics: "High-end motion graphics.",
};

export const CAMERA_MOVE_PHRASES: Record<string, string> = {
  smooth_movement: "Smooth camera movement.",
  motion_blur: "Motion blur transitions.",
  whip_pan: "Cinematic whip pans.",
  camera_shake: "Subtle camera shake on impact beats.",
  parallax: "Parallax depth movement.",
  handheld: "Natural handheld motion.",
  orbit: "Slow orbital camera drift.",
};

export const VISUAL_EFFECT_PHRASES: Record<string, string> = {
  glassmorphism: "Glassmorphism overlays.",
  particles: "Soft particles.",
  light_streaks: "Light streaks.",
  lens_flares: "Lens flares.",
  bokeh: "Cinematic bokeh depth.",
  glow: "Subtle ambient glow.",
  grain: "Fine cinematic film grain.",
  chromatic: "Restrained chromatic aberration on accents.",
  vignette: "Soft cinematic vignette.",
  scanlines: "Subtle digital scanline texture.",
  volumetric_light: "Volumetric light rays.",
  reflections: "Soft surface reflections.",
};

export const MOTION_ELEMENT_PHRASES: Record<string, string> = {
  floating_ui: "Floating UI elements.",
  icons_3d: "3D icons.",
  data_viz: "Animated data visualizations.",
  lower_thirds: "Elegant lower-third graphics.",
  progress_bars: "Animated progress indicators.",
  callouts: "Clean callout annotations.",
  diagrams: "Explanatory diagrams and concept illustrations.",
  shapes: "Geometric accent shapes.",
  logo_sting: "Branded logo sting.",
};

export const SFX_PHRASES: Record<string, string> = {
  whoosh: "Soft whooshes for transitions.",
  swish: "Swishes for camera movement.",
  impact: "Deep impacts for punch-ins.",
  deep_impact: "Deep impacts for punch-ins.",
  bass_hit: "Bass hits for emphasis.",
  ui_click: "UI clicks for interface animations.",
  pop: "Pop sounds for icons.",
  riser: "Risers before transitions.",
  reverse_sweep: "Reverse sweeps.",
  digital_beep: "Digital beeps.",
  sparkle: "Sparkle sound effects.",
  ambient: "Ambient cinematic atmosphere.",
  soft_electronic: "Soft electronic textures.",
  transition_sound: "Dedicated transition sounds.",
};

export const CONSTRAINT_PHRASES: Record<string, string> = {
  no_identity_change: "Do NOT change the speaker's identity.",
  no_voice_change: "Do NOT modify the original voice.",
  no_lip_sync_change: "Do NOT alter lip sync.",
  no_wardrobe_change: "Do NOT change the speaker's clothing or wardrobe colors.",
  no_body_proportion_change: "Do NOT alter the speaker's body proportions.",
  no_dialogue_rewrite: "Do NOT summarize, paraphrase, or rewrite the dialogue.",
  no_keyword_substitution:
    "Do NOT generate keywords instead of the spoken words.",
  no_missing_dialogue: "Do NOT omit any spoken words.",
  no_dialogue_repetition: "Do NOT repeat or duplicate any spoken words.",
  no_added_dialogue: "Do NOT add words that were never spoken.",
  no_translation: "Do NOT translate the spoken language.",
  no_caption_face_overlap: "Do NOT cover the speaker's face.",
  no_unreadable_text: "Do NOT create unreadable text.",
  no_future_dialogue: "Do NOT show dialogue before it is spoken.",
  no_effect_overload: "Do NOT overuse effects.",
  no_lighting_artifacts: "Do NOT create lighting artifacts.",
  no_source_distortion: "Do NOT distort the original footage.",
  no_chaotic_edit: "Do NOT make the edit feel chaotic or distracting.",
};

export const TRANSCRIPT_PROHIBITIONS: { flag: string; line: string }[] = [
  { flag: "summarize", line: "Do NOT summarize." },
  { flag: "paraphrase", line: "Do NOT paraphrase." },
  { flag: "allow_word_deletion", line: "Do NOT shorten." },
  { flag: "allow_rewrite", line: "Do NOT rewrite." },
  { flag: "allow_translation", line: "Do NOT translate." },
  { flag: "allow_autocorrect", line: "Do NOT correct grammar." },
  { flag: "keywords", line: "Do NOT generate keywords." },
];

export const CAPTION_POSITION_PHRASES: Record<string, string> = {
  behind_speaker: "behind the speaker",
  beside_speaker: "behind or beside the speaker",
  lower_third: "in the lower third of the frame",
  centered: "centered in the safe area",
  auto: "in the most readable position for each shot",
};

export const CAPTION_ANIMATION_PHRASES: Record<string, string> = {
  fade: "fade",
  slide: "slide",
  scale: "scale",
  masking: "masking",
  blur_in: "blur-in",
  typewriter: "typewriter reveal",
  bounce: "elastic bounce",
  glitch: "digital glitch",
};

export const PLATFORM_PHRASES: Record<string, string> = {
  instagram_reels: "Instagram Reel",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  youtube: "YouTube video",
  other: "social video",
};

export const PACING_PHRASES: Record<string, string> = {
  relaxed: "a relaxed, considered",
  standard: "a steady, professional",
  high_retention: "fast",
  fast: "rapid, high-energy",
};

/** Renders `["a", "b", "c"]` as `"a, b, and c"`. */
export function joinNatural(items: string[], conjunction = "and"): string {
  const list = items.filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} ${conjunction} ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, ${conjunction} ${list[list.length - 1]}`;
}

/** Maps a list of ids through a phrase table, dropping unknown ids. */
export function phrasesFor(
  ids: string[] | undefined,
  table: Record<string, string>
): string[] {
  if (!ids) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const phrase = table[id];
    if (phrase && !seen.has(phrase)) {
      seen.add(phrase);
      out.push(phrase);
    }
  }
  return out;
}
