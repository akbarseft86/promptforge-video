/**
 * Adds a preset to the shipped set.
 *
 *   npm run add-preset -- path/to/preset.json
 *
 * Validates against PresetSchema, refuses duplicate ids, and appends to
 * src/features/presets/derived-presets.json. Everything downstream — build,
 * deploy, commit — is the caller's job, so this stays safe to run anywhere.
 */
import fs from "node:fs";
import path from "node:path";
import { PresetSchema } from "../src/schemas/universal";
import { BUILTIN_PRESETS } from "../src/features/presets/presets";

// Resolved from the working directory, not import.meta.url: this runs as a
// bundle out of node_modules/.cache, where a relative path would miss.
const TARGET = path.resolve(
  process.cwd(),
  "src/features/presets/derived-presets.json"
);

const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const input = process.argv[2];
if (!input) fail("usage: npm run add-preset -- path/to/preset.json");

const absolute = path.resolve(input);
if (!fs.existsSync(absolute)) fail(`no such file: ${absolute}`);

let raw: unknown;
try {
  raw = JSON.parse(fs.readFileSync(absolute, "utf8"));
} catch (err) {
  fail(`not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
}

// A file holding an array is treated as a batch, so an exported set can be
// re-imported without unpacking it by hand.
const incoming = Array.isArray(raw) ? raw : [raw];
if (!incoming.length) fail("file contains no presets");

const parsed = incoming.map((p, i) => {
  const r = PresetSchema.safeParse(p);
  if (!r.success) {
    fail(
      `preset #${i + 1} is invalid:\n` +
        r.error.issues
          .map((issue) => `    ${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("\n")
    );
  }
  return (r as { success: true; data: ReturnType<typeof PresetSchema.parse> }).data;
});

const existing = JSON.parse(fs.readFileSync(TARGET, "utf8")) as { id: string }[];
// Check against everything already shipping, not just the derived file: a
// collision with a seed preset would silently shadow it in the picker.
const takenIds = new Set([
  ...BUILTIN_PRESETS.map((p) => p.id),
  ...existing.map((p) => p.id),
]);

for (const p of parsed) {
  if (takenIds.has(p.id)) {
    fail(
      `id "${p.id}" is already in use. Change the id in ${path.basename(absolute)} ` +
        `— reusing one would shadow the existing preset.`
    );
  }
  takenIds.add(p.id);
}

const next = [...existing, ...parsed.map((p) => ({ ...p, builtin: undefined }))].map(
  (p) => {
    // `builtin` is applied at load time; storing it would just be noise.
    const { builtin: _builtin, ...rest } = p as Record<string, unknown>;
    return rest;
  }
);

fs.writeFileSync(TARGET, `${JSON.stringify(next, null, 2)}\n`);

for (const p of parsed) console.log(`✓ added "${p.name}" (${p.id})`);
console.log(`  ${next.length} derived preset(s) now ship with the app.`);
