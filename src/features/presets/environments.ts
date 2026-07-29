/**
 * Ready-made environment descriptions for the Visual Direction picker.
 *
 * Each entry is written the way it should read inside the generated prompt,
 * so choosing one needs no rewording. Grouped to keep the list scannable.
 */
export const ENVIRONMENT_OPTIONS: { group: string; items: string[] }[] = [
  {
    group: "Creator studio",
    items: [
      "a premium content creator studio, luxury office, elegant creative workspace, or cinematic environment",
      "a warm creator studio with wood textures, plants, and soft key lighting",
      "a minimal white cyclorama studio with clean even lighting",
      "a dark moody studio lit by a single soft source",
      "a low-key environment with deep shadow and single-source lighting",
      "a podcast studio with acoustic panels and warm accent lighting",
      "a clean studio backdrop with controlled product lighting",
    ],
  },
  {
    group: "Tech & AI",
    items: [
      "a futuristic tech environment, modern innovation lab, or sleek digital workspace",
      "a modern innovation lab with ambient LED glow and glass surfaces",
      "a sleek digital workspace with floating holographic displays",
      "a neon-lit night environment with reflective surfaces",
    ],
  },
  {
    group: "Corporate",
    items: [
      "an elegant executive environment with refined lighting",
      "a modern corporate lobby with glass and stone finishes",
      "a premium branded set with controlled studio lighting",
      "a cinematic branded set or premium commercial environment",
      "a contemporary boardroom with city views",
    ],
  },
  {
    group: "Lifestyle",
    items: [
      "a bright, naturally lit space with soft diffusion",
      "a cozy home office with warm lamps and shelves",
      "an upscale cafe with a softly blurred background",
      "a rooftop terrace at golden hour",
      "a luxury interior with marble, brass, and warm accent light",
    ],
  },
  {
    group: "Outdoor",
    items: [
      "a city street at blue hour with bokeh lights",
      "a natural landscape under soft daylight",
      "a beach at golden hour with warm backlight",
      "an urban rooftop against a skyline at dusk",
    ],
  },
];

export const ENVIRONMENT_VALUES = ENVIRONMENT_OPTIONS.flatMap((g) => g.items);
