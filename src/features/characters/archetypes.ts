import { Character } from "../../schemas/universal";

/**
 * Starting points for a character, so a blank project does not demand that the
 * user invent someone from nothing.
 *
 * Each one describes build, hair, grooming, wardrobe and demeanour — the
 * traits that actually make an archetype legible. Skin tone and ethnicity are
 * deliberately left unstated: baking them into a job title would ship a
 * stereotype, and the user is prompted to add them, since any trait left
 * unstated is one the model is free to drift between shots.
 */
export interface CharacterArchetype {
  id: string;
  label: string;
  category: string;
  fields: Pick<
    Character,
    "appearance" | "role" | "age_range" | "wardrobe" | "voice" | "mannerisms"
  >;
}

export const CHARACTER_ARCHETYPES: CharacterArchetype[] = [
  {
    id: "founder",
    label: "Startup Founder",
    category: "Business",
    fields: {
      appearance:
        "lean build, short neatly-kept hair, clean-shaven, alert and direct expression",
      role: "founder",
      age_range: "early 30s",
      wardrobe: "charcoal blazer over a plain white tee, no tie",
      voice: "low, unhurried, lands each sentence before moving on",
      mannerisms: "talks with open hands, steady eye contact, rarely blinks away",
    },
  },
  {
    id: "sales_consultant",
    label: "Sales Consultant",
    category: "Business",
    fields: {
      appearance:
        "medium build, tidy side-parted hair, warm open face that reads approachable",
      role: "consultant",
      age_range: "late 30s",
      wardrobe: "navy shirt, sleeves rolled to the forearm, no jacket",
      voice: "bright and conversational, slightly faster than average",
      mannerisms: "leans in slightly, counts points on fingers",
    },
  },
  {
    id: "corporate_spokesperson",
    label: "Corporate Spokesperson",
    category: "Business",
    fields: {
      appearance:
        "upright posture, sharply groomed, composed and neutral expression",
      role: "spokesperson",
      age_range: "40s",
      wardrobe: "tailored dark suit, crisp light shirt",
      voice: "measured, formal, evenly paced",
      mannerisms: "minimal gesture, hands returning to a settled rest position",
    },
  },
  {
    id: "video_editor",
    label: "Video Editor / Agency Owner",
    category: "Creator",
    fields: {
      appearance:
        "relaxed build, slightly messy short hair, light stubble, easy unforced expression",
      role: "video editor",
      age_range: "late 20s",
      wardrobe: "plain heavyweight tee, simple watch",
      voice: "casual and quick, talks like a peer rather than a presenter",
      mannerisms: "gestures loosely while explaining, shrugs to punctuate",
    },
  },
  {
    id: "tech_reviewer",
    label: "Tech Reviewer",
    category: "Creator",
    fields: {
      appearance: "slim build, cropped hair, glasses, animated expression",
      role: "reviewer",
      age_range: "late 20s",
      wardrobe: "dark zip hoodie over a plain tee",
      voice: "energetic, rising emphasis on key specs",
      mannerisms: "holds products up to camera, quick precise hand movements",
    },
  },
  {
    id: "beauty_creator",
    label: "Beauty Creator",
    category: "Creator",
    fields: {
      appearance:
        "long glossy hair worn down, polished makeup with a dewy finish, bright expressive eyes",
      role: "beauty creator",
      age_range: "mid 20s",
      wardrobe: "soft neutral knit, delicate gold jewellery",
      voice: "warm and close-mic'd, almost confiding",
      mannerisms: "touches hair and jawline while explaining, frequent smiles",
    },
  },
  {
    id: "fitness_coach",
    label: "Fitness Coach",
    category: "Creator",
    fields: {
      appearance:
        "athletic muscular build, short cropped hair, strong jawline, high-energy expression",
      role: "coach",
      age_range: "early 30s",
      wardrobe: "fitted training top and joggers",
      voice: "loud, clipped, motivating",
      mannerisms: "wide stance, chops the air to emphasise counts",
    },
  },
  {
    id: "food_creator",
    label: "Food Creator",
    category: "Creator",
    fields: {
      appearance:
        "soft friendly features, hair tied back out of the way, sleeves pushed up",
      role: "cook",
      age_range: "30s",
      wardrobe: "linen apron over a simple shirt",
      voice: "relaxed, chatty, unhurried",
      mannerisms: "keeps hands busy with the food, glances up to camera between steps",
    },
  },
  {
    id: "travel_vlogger",
    label: "Travel Vlogger",
    category: "Creator",
    fields: {
      appearance:
        "sun-weathered look, wind-tousled medium-length hair, squinting slightly in daylight",
      role: "traveller",
      age_range: "late 20s",
      wardrobe: "lightweight shirt, small backpack strap across the chest",
      voice: "breathless and excited, often mid-walk",
      mannerisms: "gestures outward at surroundings, turns the camera to follow",
    },
  },
  {
    id: "instructor",
    label: "Course Instructor",
    category: "Education",
    fields: {
      appearance:
        "calm settled presence, neat medium-length hair, patient expression",
      role: "instructor",
      age_range: "40s",
      wardrobe: "soft-shouldered jacket over a plain top",
      voice: "clear and deliberate, pauses after each idea",
      mannerisms: "uses a flat open palm to mark steps in sequence",
    },
  },
  {
    id: "health_professional",
    label: "Health Professional",
    category: "Education",
    fields: {
      appearance:
        "tidy and unfussy, hair pulled back, calm reassuring expression",
      role: "clinician",
      age_range: "30s",
      wardrobe: "white coat over plain scrubs, lanyard",
      voice: "even, careful, never rushed",
      mannerisms: "steady hands, small confirming nods",
    },
  },
  {
    id: "action_lead",
    label: "Cinematic Action Lead",
    category: "Cinematic",
    fields: {
      appearance:
        "wiry athletic build, hair pulled back tight, sharp focused expression, faint scuffs and sweat",
      role: "lead",
      age_range: "late 20s",
      wardrobe: "fitted technical jacket, tactical trousers, worn boots",
      voice: "low and clipped, speaks rarely",
      mannerisms: "economical movement, scans the space before moving",
    },
  },
  {
    id: "fashion_model",
    label: "Fashion Model",
    category: "Cinematic",
    fields: {
      appearance:
        "tall slender frame, striking angular bone structure, hair styled sleek, unsmiling",
      role: "model",
      age_range: "early 20s",
      wardrobe: "structured monochrome designer piece",
      voice: "quiet, sparse — rarely speaks on camera",
      mannerisms: "slow deliberate turns, holds stillness between movements",
    },
  },
  {
    id: "street_documentary",
    label: "Documentary Subject",
    category: "Cinematic",
    fields: {
      appearance:
        "ordinary unstyled look, natural lines on the face, hair as it falls",
      role: "interviewee",
      age_range: "50s",
      wardrobe: "worn everyday jacket, nothing styled",
      voice: "unpolished, pauses to think mid-sentence",
      mannerisms: "looks slightly off-camera, hands still in lap",
    },
  },
  {
    id: "narrator_voice",
    label: "Off-Camera Narrator",
    category: "Cinematic",
    fields: {
      appearance: "never shown on camera — voice only",
      role: "narrator",
      age_range: "",
      wardrobe: "",
      voice: "deep, resonant, slow with long pauses",
      mannerisms: "",
    },
  },
  // Hijab is described as its own trait — style, fabric, drape and coverage —
  // because "wearing a hijab" alone leaves the model free to re-roll the
  // shape and colour on every clip, which reads as a different person.
  {
    id: "hijabi_founder",
    label: "Hijabi Business Owner",
    category: "Business",
    fields: {
      appearance:
        "wears a hijab, oval face fully framed by the scarf with no hair showing, composed and direct expression",
      role: "business owner",
      age_range: "early 30s",
      wardrobe:
        "neatly pinned plain satin hijab draped over the chest, tailored blazer over a long-sleeved top",
      voice: "calm and measured, warm but businesslike",
      mannerisms: "still upper body, precise hand gestures kept low",
    },
  },
  {
    id: "hijabi_creator",
    label: "Hijabi Creator",
    category: "Creator",
    fields: {
      appearance:
        "wears a hijab, soft round face fully framed by the scarf with no hair showing, bright animated expression",
      role: "content creator",
      age_range: "mid 20s",
      wardrobe:
        "lightweight pastel jersey hijab in a relaxed drape, oversized knit and long sleeves",
      voice: "warm, chatty, close to the mic",
      mannerisms: "expressive hands near the face, frequent smiles",
    },
  },
  {
    id: "hijabi_educator",
    label: "Hijabi Educator",
    category: "Education",
    fields: {
      appearance:
        "wears a hijab, calm settled face fully framed by the scarf with no hair showing, patient expression",
      role: "instructor",
      age_range: "30s",
      wardrobe:
        "plain dark hijab pinned close, loose long tunic over straight trousers",
      voice: "clear and deliberate, pauses after each idea",
      mannerisms: "flat open palm marking steps in sequence",
    },
  },
  {
    id: "hijabi_health_professional",
    label: "Hijabi Health Professional",
    category: "Education",
    fields: {
      appearance:
        "wears a hijab, tidy face fully framed by the scarf with no hair showing, reassuring expression",
      role: "clinician",
      age_range: "30s",
      wardrobe:
        "plain hijab tucked inside the collar, white coat over long-sleeved scrubs",
      voice: "even, careful, never rushed",
      mannerisms: "steady hands, small confirming nods",
    },
  },
  {
    id: "hijabi_sport",
    label: "Hijabi Fitness Coach",
    category: "Creator",
    fields: {
      appearance:
        "wears a sports hijab, strong athletic build, face fully framed by the scarf with no hair showing, high-energy expression",
      role: "coach",
      age_range: "late 20s",
      wardrobe:
        "fitted sports hijab that stays put through movement, long-sleeved training top and full-length leggings",
      voice: "loud, clipped, motivating",
      mannerisms: "wide stance, chops the air to emphasise counts",
    },
  },
  {
    id: "kid_presenter",
    label: "Young Presenter",
    category: "Education",
    fields: {
      appearance:
        "small frame, round face, bright wide-eyed expression, hair a little untidy",
      role: "young presenter",
      age_range: "around 10",
      wardrobe: "bright colourful tee",
      voice: "high, fast, enthusiastic",
      mannerisms: "bounces slightly, big exaggerated gestures",
    },
  },
];

export const ARCHETYPE_CATEGORIES = [
  ...new Set(CHARACTER_ARCHETYPES.map((a) => a.category)),
];

/**
 * Pick-lists for the identity traits.
 *
 * Offered as options rather than baked into the archetypes: attaching an
 * ethnicity or skin tone to a job title would ship a stereotype as a default.
 * Chosen deliberately by the user, the same value is exactly what pins the
 * face down across separate generations. Every list is a suggestion — each
 * field also accepts free text.
 */
export const GENDER_OPTIONS = [
  "man",
  "woman",
  "non-binary person",
  "androgynous person",
];

export const ETHNICITY_OPTIONS = [
  "Indonesian",
  "Southeast Asian",
  "East Asian",
  "South Asian",
  "Middle Eastern",
  "Black / African",
  "White / European",
  "Hispanic / Latino",
  "Mixed heritage",
];

export const SKIN_TONE_OPTIONS = [
  "very fair",
  "fair",
  "light olive",
  "olive",
  "tan",
  "golden brown",
  "deep brown",
  "very deep",
];

export const EYE_COLOR_OPTIONS = [
  "dark brown",
  "brown",
  "hazel",
  "amber",
  "green",
  "blue",
  "grey",
];

/**
 * Head-covering styles, offered on the Hair field: for a covered character the
 * scarf is what frames the face, so it belongs where hair would go. Naming the
 * style, drape and coverage keeps the silhouette from being re-rolled per clip.
 */
export const HIJAB_OPTIONS = [
  "hijab — plain satin, pinned neatly, draped over the chest, no hair showing",
  "hijab — lightweight jersey, relaxed drape, no hair showing",
  "hijab — chiffon, layered and pinned at the shoulder, no hair showing",
  "hijab — pashmina, wrapped and tucked, no hair showing",
  "hijab — instant/slip-on, close-fitting, no hair showing",
  "hijab — sports hijab, fitted and secure through movement, no hair showing",
  "khimar — long one-piece covering to the waist, no hair showing",
  "niqab — face veil with only the eyes visible",
];

export const HAIR_OPTIONS = [
  ...HIJAB_OPTIONS,
  "short black straight",
  "short dark brown wavy",
  "medium black straight, parted",
  "long black straight",
  "long dark brown wavy",
  "long black, tied back",
  "shoulder-length brown, loose curls",
  "tight black curls, cropped",
  "buzz cut, black",
  "shaved head",
  "blonde, shoulder-length",
  "grey, short and neat",
];
