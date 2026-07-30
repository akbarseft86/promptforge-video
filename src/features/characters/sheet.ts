import { Character } from "../../schemas/universal";

/**
 * The canonical character sheet.
 *
 * A video model re-invents anyone it is not pinned down about, and most tools
 * cap a generation at a few seconds — so a longer piece is many separate
 * generations, each starting from nothing but its prompt. The only thing that
 * carries a face across them is the text describing it, restated *identically*
 * every time. Reordering the traits or rewording one of them is enough to
 * produce a different person.
 *
 * So the sheet is assembled here, from fields, in a fixed order, and every
 * consumer renders the same string: the prompt, the copy button, the export.
 * Nobody retypes it.
 */

/** Trait order is part of the contract — never reorder these. */
const TRAIT_ORDER: {
  key: keyof Character;
  label: string;
}[] = [
  { key: "gender", label: "Gender" },
  { key: "age_range", label: "Age" },
  { key: "ethnicity", label: "Ethnicity" },
  { key: "skin_tone", label: "Skin tone" },
  { key: "hair", label: "Hair" },
  { key: "eye_color", label: "Eyes" },
  { key: "appearance", label: "Build and face" },
  { key: "distinguishing_features", label: "Distinguishing features" },
  { key: "wardrobe", label: "Wardrobe" },
  { key: "voice", label: "Voice" },
  { key: "mannerisms", label: "Mannerisms" },
];

/** Traits whose absence lets the model re-roll the face between clips. */
export const IDENTITY_TRAITS: (keyof Character)[] = [
  "gender",
  "ethnicity",
  "skin_tone",
  "hair",
  "eye_color",
];

/** Which identity traits are still blank, in sheet order. */
export function missingIdentityTraits(c: Character): string[] {
  return TRAIT_ORDER.filter(
    (t) =>
      IDENTITY_TRAITS.includes(t.key) && !String(c[t.key] ?? "").trim()
  ).map((t) => t.label);
}

/**
 * Deterministic, line-per-trait sheet. Blank fields are dropped rather than
 * emitted empty — an empty label reads as "unspecified" and invites the model
 * to fill it differently each run.
 */
export function characterSheet(c: Character): string {
  const lines = [`CHARACTER: ${c.name.trim()}${c.role ? ` — ${c.role.trim()}` : ""}`];
  for (const t of TRAIT_ORDER) {
    const value = String(c[t.key] ?? "").trim();
    if (value) lines.push(`${t.label}: ${value}`);
  }
  if (c.seed) lines.push(`Seed: ${c.seed.trim()}`);
  return lines.join("\n");
}

/**
 * The sheet plus the instruction that makes it binding. This is what a user
 * pastes into every separate generation when stitching a longer piece
 * together out of short clips.
 */
export function characterLockBlock(characters: Character[]): string {
  const locked = characters.filter((c) => c.lock_across_shots);
  if (!locked.length) return "";

  const sheets = characters.map(characterSheet).join("\n\n");
  const names = locked.map((c) => c.name.trim());
  const subject = names.length === 1 ? "this character" : "these characters";

  return [
    "CHARACTER LOCK — reproduce exactly, in this and every other clip:",
    "",
    sheets,
    "",
    `Render ${names.join(", ")} to match the sheet above in every shot and ` +
      `every clip: the same face, the same build, the same hair, the same eyes ` +
      `and the same wardrobe, from any angle and in any location or lighting. ` +
      `Do not restyle, re-cast, age, or redesign ${subject}, and do not ` +
      `substitute a similar-looking person. Treat any trait not listed above ` +
      `as fixed from the first clip onward rather than free to change.`,
  ].join("\n");
}
