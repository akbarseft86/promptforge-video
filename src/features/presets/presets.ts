import { Preset, PresetSchema } from "../../schemas/universal";
import derivedPresets from "./derived-presets.json";

type Pacing = Preset["editing"]["pacing"];
type Punch = Preset["editing"]["punch_in_frequency"];
type Freq = Preset["editing"]["b_roll_frequency"];
type CaptionPos = NonNullable<Preset["caption_position"]>;

interface Seed {
  id: string;
  name: string;
  category: string;
  description: string;
  visual_style: string;
  environment?: string;
  pacing: Pacing;
  punch: Punch;
  broll: Freq;
  typo: Freq;
  mg?: boolean;
  tr?: boolean;
  sfx?: "low" | "medium" | "high";
  music: string[];
  music_description?: string;
  caption_style: string;
  effects?: string[];
  motion?: string[];
  camera?: string[];
  bg?: string[];
  sfxPalette?: string[];
  colors?: string[];
  animations?: string[];
  pos?: CaptionPos;
  typography?: string;
  grading?: string;
  bgReplace?: boolean;
}

const DEFAULT_SFX = ["whoosh", "impact", "riser", "pop"];
const DEFAULT_ANIM = ["fade", "slide", "scale", "masking"];

function build(s: Seed): Preset {
  return {
    preset_version: "1.0",
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description,
    builtin: true,
    visual_style: s.visual_style,
    environment: s.environment,
    editing: {
      pacing: s.pacing,
      punch_in_frequency: s.punch,
      b_roll_frequency: s.broll,
      typography_frequency: s.typo,
      motion_graphics: s.mg ?? true,
      transitions: s.tr ?? true,
    },
    sound_design: { intensity: s.sfx ?? "medium" },
    music_styles: s.music,
    music_description: s.music_description,
    caption_style: s.caption_style,
    visual_effects: s.effects ?? [],
    motion_elements: s.motion ?? [],
    camera_moves: s.camera ?? ["smooth_movement"],
    background_elements: s.bg ?? [],
    sfx_palette: s.sfxPalette ?? DEFAULT_SFX,
    highlight_colors: s.colors ?? ["violet", "indigo", "soft blue"],
    caption_animations: s.animations ?? DEFAULT_ANIM,
    caption_position: s.pos ?? "beside_speaker",
    typography: s.typography ?? "bold modern sans-serif typography",
    color_grading: s.grading,
    background_replacement_default: s.bgReplace ?? false,
  };
}

const SEEDS: Seed[] = [
  // ---------- Creator / Social ----------
  {
    id: "cinematic_creator",
    name: "Cinematic Creator",
    category: "Creator",
    description:
      "Premium cinematic creator-style editing with tasteful motion and polished lighting.",
    visual_style: "premium cinematic creator style",
    environment:
      "a premium content creator studio, luxury office, elegant creative workspace, or cinematic environment",
    pacing: "high_retention",
    punch: "medium",
    broll: "medium",
    typo: "medium",
    music: ["cinematic", "inspirational", "electronic"],
    music_description:
      "premium inspirational cinematic electronic music with a modern corporate feel — energetic, elegant, motivational, and emotional while remaining subtle beneath the narration",
    caption_style: "premium_bold",
    effects: ["bokeh", "glow", "light_streaks", "lens_flares", "particles"],
    motion: ["floating_ui", "icons_3d", "lower_thirds"],
    camera: ["smooth_movement", "motion_blur", "whip_pan"],
    bg: [
      "soft ambient lighting",
      "depth of field",
      "bokeh lights",
      "LED accent lighting",
      "high-end interior design",
    ],
    sfxPalette: [
      "whoosh",
      "swish",
      "impact",
      "bass_hit",
      "ui_click",
      "pop",
      "riser",
      "sparkle",
      "ambient",
    ],
    colors: ["violet", "indigo", "gold", "soft blue"],
    grading: "premium cinematic color grading",
    bgReplace: true,
  },
  {
    id: "fast_paced_viral",
    name: "Fast-Paced Viral",
    category: "Creator",
    description:
      "Rapid visual changes, punch-ins, typography emphasis, B-roll, and retention-focused pacing.",
    visual_style: "high-energy viral social style",
    pacing: "fast",
    punch: "medium_high",
    broll: "medium",
    typo: "high",
    music: ["energetic", "electronic"],
    music_description:
      "driving high-energy electronic music that keeps momentum without burying the voice",
    caption_style: "bold_highlight",
    effects: ["glow", "light_streaks", "chromatic"],
    motion: ["floating_ui", "shapes", "progress_bars"],
    camera: ["whip_pan", "motion_blur", "camera_shake"],
    sfxPalette: ["whoosh", "impact", "bass_hit", "riser", "pop", "digital_beep"],
    colors: ["yellow", "violet", "white"],
    animations: ["scale", "bounce", "slide", "masking"],
    grading: "punchy high-contrast grade",
  },
  {
    id: "talking_head_pro",
    name: "Talking Head Pro",
    category: "Creator",
    description:
      "Speaker-first editing with clean punch-ins and word-synced captions. Nothing about the person changes.",
    visual_style: "professional talking-head creator style",
    pacing: "high_retention",
    punch: "medium",
    broll: "low",
    typo: "medium",
    music: ["minimal", "inspirational"],
    caption_style: "clean_bold",
    effects: ["bokeh", "glow"],
    motion: ["lower_thirds", "callouts"],
    sfxPalette: ["whoosh", "impact", "pop"],
    pos: "beside_speaker",
  },
  {
    id: "hook_retention",
    name: "Hook-Driven Retention",
    category: "Creator",
    description:
      "Aggressive opening hook, constant pattern interrupts, and maximum watch-time engineering.",
    visual_style: "retention-engineered social style",
    pacing: "fast",
    punch: "high",
    broll: "high",
    typo: "high",
    music: ["energetic", "electronic", "motivational"],
    caption_style: "bold_highlight",
    effects: ["glow", "light_streaks", "particles", "chromatic"],
    motion: ["floating_ui", "shapes", "progress_bars", "icons_3d"],
    camera: ["whip_pan", "camera_shake", "motion_blur"],
    sfxPalette: ["whoosh", "impact", "bass_hit", "riser", "reverse_sweep", "digital_beep"],
    animations: ["scale", "bounce", "glitch", "masking"],
  },
  {
    id: "faceless_content",
    name: "Faceless Content",
    category: "Creator",
    description:
      "B-roll and typography carry the story — built for creators who never appear on camera.",
    visual_style: "faceless cinematic b-roll style",
    pacing: "high_retention",
    punch: "low",
    broll: "high",
    typo: "high",
    music: ["cinematic", "electronic", "emotional"],
    caption_style: "full_frame_kinetic",
    effects: ["bokeh", "grain", "vignette", "light_streaks"],
    motion: ["shapes", "icons_3d", "lower_thirds"],
    camera: ["parallax", "smooth_movement"],
    pos: "centered",
    colors: ["white", "gold", "soft blue"],
  },
  {
    id: "ugc_authentic",
    name: "UGC Authentic",
    category: "Creator",
    description:
      "Native, unpolished-feeling edit that reads as genuine user content rather than an ad.",
    visual_style: "authentic UGC style",
    pacing: "standard",
    punch: "low",
    broll: "low",
    typo: "medium",
    mg: false,
    music: ["minimal", "energetic"],
    caption_style: "native_app_style",
    effects: [],
    camera: ["handheld"],
    sfx: "low",
    sfxPalette: ["pop", "whoosh"],
    pos: "centered",
    typography: "native platform-style rounded sans-serif",
  },
  {
    id: "vlog_daily",
    name: "Daily Vlog",
    category: "Creator",
    description:
      "Warm, personal storytelling pace with light B-roll and friendly typography.",
    visual_style: "warm personal vlog style",
    pacing: "standard",
    punch: "low",
    broll: "medium",
    typo: "low",
    music: ["inspirational", "minimal"],
    caption_style: "friendly_rounded",
    effects: ["bokeh", "grain"],
    camera: ["handheld", "smooth_movement"],
    sfx: "low",
    grading: "warm natural grade",
  },

  // ---------- Corporate / Brand ----------
  {
    id: "luxury_corporate",
    name: "Luxury Corporate",
    category: "Corporate",
    description:
      "Elegant corporate visuals, premium typography, subtle animations, refined transitions.",
    visual_style: "elegant luxury corporate style",
    environment: "an elegant executive environment with refined lighting",
    pacing: "standard",
    punch: "low",
    broll: "low",
    typo: "medium",
    music: ["corporate", "luxury", "minimal"],
    music_description:
      "restrained premium corporate music with an elegant, confident tone",
    caption_style: "elegant_serif_accent",
    effects: ["bokeh", "glow", "reflections", "vignette"],
    motion: ["lower_thirds", "logo_sting"],
    sfx: "low",
    sfxPalette: ["whoosh", "ui_click", "ambient"],
    colors: ["gold", "champagne", "deep navy"],
    typography: "refined premium sans-serif typography",
    grading: "elegant desaturated premium grade",
    pos: "lower_third",
  },
  {
    id: "brand_commercial",
    name: "Premium Brand Commercial",
    category: "Corporate",
    description:
      "Agency-grade commercial polish with hero moments and a branded close.",
    visual_style: "world-class brand commercial style",
    environment: "a cinematic branded set or premium commercial environment",
    pacing: "high_retention",
    punch: "medium",
    broll: "high",
    typo: "medium",
    music: ["cinematic", "luxury", "motivational"],
    caption_style: "commercial_bold",
    effects: ["lens_flares", "light_streaks", "bokeh", "volumetric_light"],
    motion: ["logo_sting", "icons_3d", "shapes"],
    camera: ["smooth_movement", "orbit", "motion_blur"],
    bg: ["controlled studio lighting", "depth of field", "premium set design"],
    grading: "rich cinematic commercial grade",
    bgReplace: true,
  },
  {
    id: "startup_pitch",
    name: "Startup Pitch",
    category: "Corporate",
    description:
      "Confident founder-style delivery with data callouts and clean product moments.",
    visual_style: "modern startup pitch style",
    pacing: "high_retention",
    punch: "medium",
    broll: "medium",
    typo: "medium",
    music: ["inspirational", "electronic", "corporate"],
    caption_style: "modern_clean",
    effects: ["glassmorphism", "glow"],
    motion: ["data_viz", "floating_ui", "callouts", "progress_bars"],
    colors: ["indigo", "violet", "white"],
  },
  {
    id: "product_showcase",
    name: "Product Showcase",
    category: "Corporate",
    description:
      "Hero product framing, orbital motion, and feature callouts synced to the narration.",
    visual_style: "premium product showcase style",
    environment: "a clean studio backdrop with controlled product lighting",
    pacing: "standard",
    punch: "medium",
    broll: "high",
    typo: "medium",
    music: ["luxury", "electronic", "minimal"],
    caption_style: "feature_callout",
    effects: ["reflections", "glow", "bokeh", "lens_flares"],
    motion: ["callouts", "icons_3d", "shapes"],
    camera: ["orbit", "smooth_movement"],
    pos: "beside_speaker",
  },
  {
    id: "real_estate_luxury",
    name: "Luxury Real Estate",
    category: "Corporate",
    description:
      "Sweeping property reveals, elegant lower thirds, and an aspirational tone.",
    visual_style: "luxury real estate cinematic style",
    pacing: "relaxed",
    punch: "low",
    broll: "high",
    typo: "low",
    music: ["luxury", "cinematic", "emotional"],
    caption_style: "elegant_serif_accent",
    effects: ["volumetric_light", "bokeh", "reflections", "vignette"],
    motion: ["lower_thirds"],
    camera: ["orbit", "smooth_movement", "parallax"],
    sfx: "low",
    colors: ["gold", "warm white"],
    grading: "warm aspirational grade",
  },
  {
    id: "testimonial_social_proof",
    name: "Testimonial / Social Proof",
    category: "Corporate",
    description:
      "Credibility-first edit: clean speaker framing, quote emphasis, minimal distraction.",
    visual_style: "credible testimonial style",
    pacing: "standard",
    punch: "low",
    broll: "low",
    typo: "medium",
    mg: false,
    music: ["minimal", "emotional"],
    caption_style: "quote_emphasis",
    effects: ["bokeh"],
    motion: ["lower_thirds"],
    sfx: "low",
    pos: "lower_third",
  },

  // ---------- Tech / AI ----------
  {
    id: "tech_ai_futuristic",
    name: "Tech / AI Futuristic",
    category: "Tech",
    description:
      "Glassmorphism, subtle glow, futuristic UI elements, digital SFX, modern typography.",
    visual_style: "futuristic tech and AI style",
    environment:
      "a futuristic tech environment, modern innovation lab, or sleek digital workspace",
    pacing: "high_retention",
    punch: "medium",
    broll: "medium",
    typo: "high",
    music: ["futuristic", "electronic", "cinematic"],
    music_description:
      "modern futuristic electronic music with clean synth textures and a forward-driving pulse",
    caption_style: "modern_glass",
    effects: ["glassmorphism", "glow", "particles", "light_streaks", "scanlines"],
    motion: ["floating_ui", "icons_3d", "data_viz", "shapes"],
    camera: ["parallax", "smooth_movement", "motion_blur"],
    bg: ["ambient LED glow", "glassmorphism panels", "depth of field", "soft particles"],
    sfxPalette: [
      "digital_beep",
      "ui_click",
      "whoosh",
      "riser",
      "reverse_sweep",
      "soft_electronic",
      "sparkle",
    ],
    colors: ["violet", "indigo", "cyan", "soft blue"],
    bgReplace: true,
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    category: "Tech",
    description:
      "High-contrast neon aesthetic with glitch accents and aggressive digital sound design.",
    visual_style: "cyberpunk neon style",
    environment: "a neon-lit night environment with reflective surfaces",
    pacing: "fast",
    punch: "medium_high",
    broll: "medium",
    typo: "high",
    music: ["electronic", "futuristic", "energetic"],
    caption_style: "neon_glitch",
    effects: ["glow", "chromatic", "scanlines", "light_streaks", "reflections"],
    motion: ["shapes", "floating_ui"],
    camera: ["whip_pan", "camera_shake", "motion_blur"],
    sfxPalette: ["digital_beep", "reverse_sweep", "bass_hit", "riser", "impact"],
    colors: ["magenta", "cyan", "electric violet"],
    animations: ["glitch", "slide", "scale"],
    grading: "high-contrast neon grade",
    bgReplace: true,
  },
  {
    id: "saas_explainer",
    name: "SaaS Explainer",
    category: "Tech",
    description:
      "Screen-recording friendly pacing with UI callouts and clean feature typography.",
    visual_style: "clean SaaS product explainer style",
    pacing: "standard",
    punch: "low",
    broll: "medium",
    typo: "medium",
    music: ["corporate", "minimal", "electronic"],
    caption_style: "modern_clean",
    effects: ["glassmorphism", "glow"],
    motion: ["callouts", "floating_ui", "progress_bars", "diagrams"],
    sfx: "low",
    sfxPalette: ["ui_click", "pop", "whoosh"],
    pos: "lower_third",
  },
  {
    id: "data_story",
    name: "Data Story",
    category: "Tech",
    description:
      "Numbers-led narrative with animated charts timed to the spoken figures.",
    visual_style: "analytical data storytelling style",
    pacing: "standard",
    punch: "low",
    broll: "medium",
    typo: "high",
    music: ["corporate", "minimal", "futuristic"],
    caption_style: "data_emphasis",
    effects: ["glassmorphism", "glow"],
    motion: ["data_viz", "diagrams", "callouts", "progress_bars"],
    sfx: "low",
    colors: ["indigo", "emerald", "amber"],
  },

  // ---------- Education ----------
  {
    id: "educational_explainer",
    name: "Educational Explainer",
    category: "Education",
    description:
      "Clear captions, concept illustrations, B-roll, diagrams, topic highlighting.",
    visual_style: "clear educational explainer style",
    pacing: "standard",
    punch: "low",
    broll: "high",
    typo: "medium",
    music: ["minimal", "inspirational"],
    caption_style: "readable_educational",
    effects: ["glow"],
    motion: ["diagrams", "callouts", "icons_3d", "lower_thirds"],
    sfx: "low",
    sfxPalette: ["pop", "ui_click", "whoosh"],
    typography: "highly legible sans-serif typography",
    pos: "lower_third",
  },
  {
    id: "course_lesson",
    name: "Course Lesson",
    category: "Education",
    description:
      "Structured lesson pacing with chapter markers and takeaway emphasis.",
    visual_style: "structured course lesson style",
    pacing: "relaxed",
    punch: "low",
    broll: "medium",
    typo: "medium",
    music: ["minimal"],
    caption_style: "readable_educational",
    motion: ["lower_thirds", "progress_bars", "diagrams"],
    sfx: "low",
    pos: "lower_third",
  },
  {
    id: "documentary_style",
    name: "Documentary",
    category: "Education",
    description:
      "Observational pacing, archival-feel B-roll, restrained typography and score.",
    visual_style: "cinematic documentary style",
    pacing: "relaxed",
    punch: "low",
    broll: "high",
    typo: "low",
    mg: false,
    music: ["emotional", "cinematic", "minimal"],
    caption_style: "documentary_subtitle",
    effects: ["grain", "vignette", "bokeh"],
    camera: ["handheld", "smooth_movement"],
    sfx: "low",
    sfxPalette: ["ambient"],
    grading: "muted filmic grade",
    pos: "lower_third",
  },
  {
    id: "whiteboard_concept",
    name: "Whiteboard Concept",
    category: "Education",
    description:
      "Concept-drawing overlays that build as the idea is explained.",
    visual_style: "whiteboard concept-building style",
    pacing: "standard",
    punch: "off",
    broll: "medium",
    typo: "medium",
    music: ["minimal", "inspirational"],
    caption_style: "handwritten_accent",
    motion: ["diagrams", "callouts", "shapes"],
    sfx: "low",
    sfxPalette: ["pop", "ui_click"],
  },

  // ---------- Podcast / Interview ----------
  {
    id: "podcast_clip",
    name: "Podcast Clip",
    category: "Podcast",
    description:
      "Speaker-focused framing, captions, smart punch-ins, speaker changes, topic emphasis.",
    visual_style: "speaker-focused podcast clip style",
    pacing: "high_retention",
    punch: "medium",
    broll: "low",
    typo: "medium",
    mg: false,
    music: ["minimal", "ambient"],
    caption_style: "speaker_labeled",
    effects: ["bokeh"],
    sfx: "low",
    sfxPalette: ["whoosh", "impact"],
    pos: "centered",
  },
  {
    id: "interview_multispeaker",
    name: "Multi-Speaker Interview",
    category: "Podcast",
    description:
      "Speaker-aware cutting with labeled captions and clean reaction cutaways.",
    visual_style: "multi-speaker interview style",
    pacing: "high_retention",
    punch: "medium",
    broll: "low",
    typo: "medium",
    mg: false,
    music: ["minimal", "ambient"],
    caption_style: "speaker_labeled",
    sfx: "low",
    pos: "lower_third",
  },
  {
    id: "quote_highlight",
    name: "Quote Highlight",
    category: "Podcast",
    description:
      "Single powerful statement blown up into full-frame kinetic typography.",
    visual_style: "quote-forward highlight style",
    pacing: "high_retention",
    punch: "medium",
    broll: "off",
    typo: "high",
    music: ["cinematic", "emotional"],
    caption_style: "full_frame_kinetic",
    effects: ["glow", "bokeh", "vignette"],
    pos: "centered",
    colors: ["gold", "white"],
  },

  // ---------- Aesthetic / Lifestyle ----------
  {
    id: "minimal_clean",
    name: "Minimal Clean",
    category: "Aesthetic",
    description:
      "Clean typography, subtle movement, minimal visual effects, professional presentation.",
    visual_style: "minimal clean professional style",
    pacing: "relaxed",
    punch: "off",
    broll: "off",
    typo: "low",
    mg: false,
    tr: false,
    music: ["minimal"],
    caption_style: "clean_sans",
    effects: [],
    sfx: "low",
    sfxPalette: [],
    colors: ["white"],
    animations: ["fade"],
    pos: "lower_third",
  },
  {
    id: "editorial_fashion",
    name: "Editorial Fashion",
    category: "Aesthetic",
    description:
      "High-fashion editorial pacing with bold serif typography and stark transitions.",
    visual_style: "high-fashion editorial style",
    pacing: "high_retention",
    punch: "medium",
    broll: "medium",
    typo: "medium",
    music: ["electronic", "luxury", "energetic"],
    caption_style: "editorial_serif",
    effects: ["grain", "vignette", "chromatic"],
    camera: ["whip_pan", "motion_blur"],
    typography: "bold editorial serif typography",
    colors: ["white", "black", "gold"],
    grading: "high-contrast editorial grade",
  },
  {
    id: "cinematic_film_look",
    name: "Cinematic Film Look",
    category: "Aesthetic",
    description:
      "Anamorphic-feel framing, filmic grain, and a restrained emotional score.",
    visual_style: "cinematic feature-film look",
    pacing: "relaxed",
    punch: "low",
    broll: "medium",
    typo: "low",
    mg: false,
    music: ["cinematic", "emotional"],
    caption_style: "film_subtitle",
    effects: ["grain", "vignette", "lens_flares", "bokeh", "volumetric_light"],
    camera: ["smooth_movement", "parallax"],
    sfx: "low",
    sfxPalette: ["ambient", "whoosh"],
    grading: "teal-and-orange filmic grade",
    pos: "lower_third",
  },
  {
    id: "vintage_film",
    name: "Vintage Film",
    category: "Aesthetic",
    description:
      "Retro grain, warm halation, and nostalgic pacing for story-led content.",
    visual_style: "vintage retro film style",
    pacing: "relaxed",
    punch: "off",
    broll: "medium",
    typo: "low",
    mg: false,
    music: ["emotional", "minimal"],
    caption_style: "retro_type",
    effects: ["grain", "vignette", "glow", "chromatic"],
    camera: ["handheld"],
    sfx: "low",
    grading: "warm faded vintage grade",
    typography: "classic condensed typography",
  },
  {
    id: "dark_moody",
    name: "Dark & Moody",
    category: "Aesthetic",
    description:
      "Low-key lighting, deep shadows, and tense sound design for dramatic delivery.",
    visual_style: "dark moody cinematic style",
    environment: "a low-key environment with deep shadow and single-source lighting",
    pacing: "high_retention",
    punch: "medium",
    broll: "medium",
    typo: "medium",
    music: ["cinematic", "emotional", "electronic"],
    caption_style: "high_contrast_bold",
    effects: ["vignette", "volumetric_light", "grain", "glow"],
    sfxPalette: ["bass_hit", "riser", "impact", "ambient", "reverse_sweep"],
    colors: ["amber", "white"],
    grading: "crushed-shadow low-key grade",
  },
  {
    id: "bright_airy",
    name: "Bright & Airy",
    category: "Aesthetic",
    description:
      "Light, clean, high-key look for lifestyle and wellness content.",
    visual_style: "bright airy lifestyle style",
    environment: "a bright, naturally lit space with soft diffusion",
    pacing: "standard",
    punch: "low",
    broll: "medium",
    typo: "low",
    music: ["inspirational", "minimal"],
    caption_style: "soft_rounded",
    effects: ["glow", "bokeh"],
    sfx: "low",
    colors: ["soft blue", "sage", "warm white"],
    grading: "high-key airy grade",
  },

  // ---------- Niche ----------
  {
    id: "fitness_energy",
    name: "Fitness Energy",
    category: "Niche",
    description:
      "Hard-hitting cuts synced to movement with impact-heavy sound design.",
    visual_style: "high-intensity fitness style",
    pacing: "fast",
    punch: "high",
    broll: "medium",
    typo: "high",
    music: ["energetic", "electronic", "motivational"],
    caption_style: "impact_bold",
    effects: ["glow", "chromatic", "light_streaks"],
    camera: ["camera_shake", "whip_pan", "motion_blur"],
    sfxPalette: ["impact", "bass_hit", "whoosh", "riser"],
    colors: ["red", "white", "electric blue"],
    animations: ["scale", "bounce"],
  },
  {
    id: "travel_cinematic",
    name: "Travel Cinematic",
    category: "Niche",
    description:
      "Sweeping location B-roll with an emotional score and light typography.",
    visual_style: "cinematic travel style",
    pacing: "standard",
    punch: "low",
    broll: "high",
    typo: "low",
    music: ["cinematic", "emotional", "inspirational"],
    caption_style: "location_marker",
    effects: ["lens_flares", "bokeh", "volumetric_light", "grain"],
    camera: ["smooth_movement", "parallax", "orbit"],
    sfxPalette: ["whoosh", "ambient", "sparkle"],
    grading: "vibrant warm travel grade",
  },
  {
    id: "food_cinematic",
    name: "Food Cinematic",
    category: "Niche",
    description:
      "Macro texture emphasis, slow reveals, and appetizing warm grading.",
    visual_style: "cinematic food style",
    pacing: "relaxed",
    punch: "low",
    broll: "high",
    typo: "low",
    music: ["minimal", "emotional"],
    caption_style: "soft_rounded",
    effects: ["bokeh", "glow", "reflections"],
    camera: ["smooth_movement", "orbit"],
    sfx: "low",
    sfxPalette: ["sparkle", "ambient", "pop"],
    grading: "warm appetizing grade",
  },
  {
    id: "music_beat_sync",
    name: "Music Beat-Sync",
    category: "Niche",
    description:
      "Cuts and typography locked to the musical grid for rhythm-led edits.",
    visual_style: "beat-synchronized music style",
    pacing: "fast",
    punch: "high",
    broll: "medium",
    typo: "high",
    music: ["electronic", "energetic"],
    caption_style: "beat_synced_type",
    effects: ["light_streaks", "glow", "chromatic", "particles"],
    camera: ["camera_shake", "whip_pan", "motion_blur"],
    sfxPalette: ["impact", "bass_hit", "riser", "reverse_sweep"],
    animations: ["scale", "bounce", "glitch"],
  },
  {
    id: "news_briefing",
    name: "News Briefing",
    category: "Niche",
    description:
      "Authoritative broadcast framing with tickers and factual lower thirds.",
    visual_style: "broadcast news briefing style",
    pacing: "standard",
    punch: "low",
    broll: "medium",
    typo: "medium",
    music: ["corporate", "minimal"],
    caption_style: "broadcast_lower_third",
    effects: ["glow"],
    motion: ["lower_thirds", "callouts", "shapes"],
    sfx: "low",
    sfxPalette: ["whoosh", "ui_click", "digital_beep"],
    pos: "lower_third",
    typography: "authoritative broadcast sans-serif",
  },
  {
    id: "storytelling_emotional",
    name: "Emotional Storytelling",
    category: "Niche",
    description:
      "Slow build, breathing room around key lines, and an emotive score.",
    visual_style: "emotional narrative style",
    pacing: "relaxed",
    punch: "low",
    broll: "medium",
    typo: "medium",
    mg: false,
    music: ["emotional", "cinematic"],
    caption_style: "gentle_reveal",
    effects: ["bokeh", "grain", "vignette", "glow"],
    camera: ["smooth_movement", "parallax"],
    sfx: "low",
    sfxPalette: ["ambient", "whoosh"],
    animations: ["fade", "blur_in", "scale"],
    grading: "soft emotive grade",
  },
];

/**
 * Presets reverse-engineered from real edits, stored as complete Preset
 * objects rather than seeds — the shape `scripts/add-preset.ts` appends to and
 * the same shape the app exports. Anything that fails validation is dropped
 * rather than crashing the picker, so one bad entry cannot take out the app.
 */
const DERIVED_PRESETS: Preset[] = (derivedPresets as unknown[])
  .map((p) => PresetSchema.safeParse(p))
  .filter((r): r is { success: true; data: Preset } => r.success)
  .map((r) => ({ ...r.data, builtin: true }));

export const BUILTIN_PRESETS: Preset[] = [...SEEDS.map(build), ...DERIVED_PRESETS];

export const PRESET_CATEGORIES = [
  ...new Set(BUILTIN_PRESETS.map((p) => p.category ?? "Other")),
];

const STORAGE_KEY = "pfv.custom_presets.v1";

export function loadCustomPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((p) => PresetSchema.safeParse(p))
      .filter((r) => r.success)
      .map((r) => (r as { success: true; data: Preset }).data);
  } catch {
    return [];
  }
}

export function saveCustomPresets(presets: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function validateImportedPreset(json: unknown):
  | { ok: true; preset: Preset }
  | { ok: false; error: string } {
  const parsed = PresetSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  return { ok: true, preset: { ...parsed.data, builtin: false } };
}

/** Keyword-based preset recommendation (replaced by AI analysis when the server is configured). */
export function recommendPreset(opts: {
  instructions: string;
  hasVideo: boolean;
  speakerCount: number;
  durationSeconds?: number;
}): { presetId: string; reason: string } {
  const text = opts.instructions.toLowerCase();
  const has = (...words: string[]) => words.some((w) => text.includes(w));

  const rules: [boolean, string, string][] = [
    [
      has("podcast", "interview", "guest", "host"),
      "podcast_clip",
      "Instructions mention podcast/interview-style content.",
    ],
    [
      opts.speakerCount > 1,
      "interview_multispeaker",
      "Multiple speakers detected — speaker-aware editing fits best.",
    ],
    [
      has("faceless", "no face", "without showing"),
      "faceless_content",
      "Faceless content detected — B-roll and typography carry the story.",
    ],
    [
      has("cyber", "neon", "glitch"),
      "cyber_neon",
      "Neon/cyber aesthetic detected.",
    ],
    [
      has("ai", "tech", "futuristic", "saas", "glass", "software"),
      "tech_ai_futuristic",
      "Tech/AI themes detected in the editing instructions.",
    ],
    [
      has("fitness", "workout", "gym", "training"),
      "fitness_energy",
      "Fitness content detected — impact-led pacing fits best.",
    ],
    [
      has("travel", "destination", "trip"),
      "travel_cinematic",
      "Travel content detected.",
    ],
    [
      has("food", "recipe", "cooking", "restaurant"),
      "food_cinematic",
      "Food content detected.",
    ],
    [
      has("product", "showcase", "unboxing", "feature"),
      "product_showcase",
      "Product-led content detected.",
    ],
    [
      has("testimonial", "review", "social proof"),
      "testimonial_social_proof",
      "Testimonial content detected — credibility-first editing.",
    ],
    [
      has("luxury", "corporate", "elegant", "executive"),
      "luxury_corporate",
      "Luxury/corporate direction detected.",
    ],
    [
      has("explain", "tutorial", "education", "lesson", "diagram", "teach"),
      "educational_explainer",
      "Educational/explainer intent detected.",
    ],
    [
      has("documentary", "story", "narrative"),
      "storytelling_emotional",
      "Narrative storytelling intent detected.",
    ],
    [
      has("viral", "retention", "hook", "watch time"),
      "hook_retention",
      "Instructions emphasize retention and hooks.",
    ],
    [
      has("fast", "tiktok", "energetic"),
      "fast_paced_viral",
      "Fast-paced short-form direction detected.",
    ],
    [
      has("minimal", "clean", "simple", "subtle"),
      "minimal_clean",
      "Minimal/clean direction detected.",
    ],
  ];

  for (const [match, presetId, reason] of rules) {
    if (match) return { presetId, reason };
  }
  return {
    presetId: "cinematic_creator",
    reason:
      "Default recommendation for short-form creator content: cinematic premium style.",
  };
}
