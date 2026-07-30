/**
 * Adds a character to the set that ships with the app.
 *
 *   npm run add-character -- path/to/character.json
 *
 * Validates against CharacterSchema, refuses a duplicate id or name, and
 * appends to src/features/characters/shipped-characters.json. Build, deploy
 * and commit are the caller's job, so this stays safe to run anywhere.
 */
import fs from "node:fs";
import path from "node:path";
import { CharacterSchema } from "../src/schemas/universal";
import { SHIPPED_CHARACTERS } from "../src/features/characters/library";

// Resolved from the working directory, not import.meta.url: this runs as a
// bundle out of node_modules/.cache, where a relative path would miss.
const TARGET = path.resolve(
  process.cwd(),
  "src/features/characters/shipped-characters.json"
);

const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const input = process.argv[2];
if (!input) fail("usage: npm run add-character -- path/to/character.json");

const absolute = path.resolve(input);
if (!fs.existsSync(absolute)) fail(`no such file: ${absolute}`);

let raw: unknown;
try {
  raw = JSON.parse(fs.readFileSync(absolute, "utf8"));
} catch (err) {
  fail(`not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
}

// An array is treated as a batch, so an exported library re-imports whole.
const incoming = Array.isArray(raw) ? raw : [raw];
if (!incoming.length) fail("file contains no characters");

const parsed = incoming.map((c, i) => {
  const r = CharacterSchema.safeParse(c);
  if (!r.success) {
    fail(
      `character #${i + 1} is invalid:\n` +
        r.error.issues
          .map((issue) => `    ${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("\n")
    );
  }
  return (r as { success: true; data: ReturnType<typeof CharacterSchema.parse> })
    .data;
});

const existing = JSON.parse(fs.readFileSync(TARGET, "utf8")) as Character[];
type Character = ReturnType<typeof CharacterSchema.parse>;

const takenIds = new Set([
  ...SHIPPED_CHARACTERS.map((c) => c.id),
  ...existing.map((c) => c.id),
]);
// Names matter as much as ids here: the library merges by name, so two
// characters sharing one would overwrite each other on a user's machine.
const takenNames = new Set(
  [...SHIPPED_CHARACTERS, ...existing].map((c) => c.name.trim().toLowerCase())
);

for (const c of parsed) {
  if (takenIds.has(c.id)) fail(`id "${c.id}" is already in use.`);
  if (takenNames.has(c.name.trim().toLowerCase())) {
    fail(
      `name "${c.name}" is already in use — the library merges by name, so ` +
        `this would overwrite the existing character on every user's machine.`
    );
  }
  takenIds.add(c.id);
  takenNames.add(c.name.trim().toLowerCase());
}

const next = [...existing, ...parsed];
fs.writeFileSync(TARGET, `${JSON.stringify(next, null, 2)}\n`);

for (const c of parsed) console.log(`✓ added "${c.name}" (${c.id})`);
console.log(`  ${next.length} character(s) now ship with the app.`);
