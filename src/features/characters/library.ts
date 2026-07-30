import { Character, CharacterSchema } from "../../schemas/universal";

/**
 * Saved characters, kept outside any one project.
 *
 * A character is worth defining once and reusing: a long piece is stitched
 * from many short generations, often across separate projects, and every one
 * of them needs the same sheet. Storing it per-project would mean retyping —
 * and a retyped description is a different person.
 */
const STORAGE_KEY = "pfv.characters.v1";

export function loadCharacterLibrary(): Character[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((c) => CharacterSchema.safeParse(c))
      .filter((r): r is { success: true; data: Character } => r.success)
      .map((r) => r.data);
  } catch {
    return [];
  }
}

export function saveCharacterLibrary(characters: Character[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  } catch {
    /* storage may be unavailable */
  }
}

export function validateImportedCharacter(json: unknown):
  | { ok: true; character: Character }
  | { ok: false; error: string } {
  const parsed = CharacterSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  return { ok: true, character: parsed.data };
}
