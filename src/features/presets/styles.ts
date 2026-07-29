/**
 * Ready-made visual style descriptions for the Visual Direction picker.
 *
 * Mirrors the vocabulary the built-in presets use, so switching presets shows
 * a selected option rather than dropping into a free-text field. Grouped to
 * match the preset categories.
 */
export const STYLE_OPTIONS: { group: string; items: string[] }[] = [
  {
    group: "Creator",
    items: [
      "premium cinematic creator style",
      "professional talking-head creator style",
      "high-energy viral social style",
      "retention-engineered social style",
      "faceless cinematic b-roll style",
      "authentic UGC style",
      "warm personal vlog style",
    ],
  },
  {
    group: "Corporate",
    items: [
      "elegant luxury corporate style",
      "world-class brand commercial style",
      "modern startup pitch style",
      "premium product showcase style",
      "luxury real estate cinematic style",
      "credible testimonial style",
    ],
  },
  {
    group: "Tech",
    items: [
      "futuristic tech and AI style",
      "cyberpunk neon style",
      "clean SaaS product explainer style",
      "analytical data storytelling style",
    ],
  },
  {
    group: "Education",
    items: [
      "clear educational explainer style",
      "structured course lesson style",
      "cinematic documentary style",
      "whiteboard concept-building style",
    ],
  },
  {
    group: "Podcast",
    items: [
      "speaker-focused podcast clip style",
      "multi-speaker interview style",
      "quote-forward highlight style",
    ],
  },
  {
    group: "Aesthetic",
    items: [
      "minimal clean professional style",
      "high-fashion editorial style",
      "cinematic feature-film look",
      "vintage retro film style",
      "dark moody cinematic style",
      "bright airy lifestyle style",
    ],
  },
  {
    group: "Niche",
    items: [
      "high-intensity fitness style",
      "cinematic travel style",
      "cinematic food style",
      "beat-synchronized music style",
      "broadcast news briefing style",
      "emotional narrative style",
    ],
  },
];

export const STYLE_VALUES = STYLE_OPTIONS.flatMap((g) => g.items);
