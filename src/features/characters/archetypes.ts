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
