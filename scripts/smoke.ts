import { generateUniversalProject } from "../src/services/generation";
import { validateProject, compareTranscriptTokens } from "../src/features/validator/validate";
import { generateHumanPrompt } from "../src/services/humanPrompt";
import { ADAPTERS } from "../src/adapters";
import { BUILTIN_PRESETS } from "../src/features/presets/presets";

const locked =
  "burung pipit, hinggap di dahan, terbang rendah, mencari padi, dunia sibuk jangan jadikan beban, pakai AI, konten jadi setiap hari";

const project = generateUniversalProject({
  projectName: "Creator Reel",
  instructions:
    "Transform this into a premium high-retention reel. Keep the person exactly the same, create word-for-word captions, use cinematic editing, B-roll, motion graphics, and sound effects.",
  customStyle: "",
  preset: BUILTIN_PRESETS[0],
  transcriptMode: "manual",
  manualTranscript: locked,
  autoTranscript: "",
  language: "id",
  speakers: [{ id: "speaker_1", label: "Creator" }],
  preservation: {
    identity: true,
    voice: true,
    lip_sync: true,
    facial_expression: true,
    body_language: true,
    clothing: true,
    original_colors: true,
    body_proportions: true,
    original_language: true,
    camera_perspective: false,
  },
  source: {
    media_type: "video",
    file_name: "reel.mp4",
    duration_seconds: 15.2,
    aspect_ratio: "9:16",
    resolution: "1080x1920",
    size_bytes: 12_000_000,
  },
  platformTargets: ["instagram_reels", "tiktok", "youtube_shorts"],
});

let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
};

console.log("Generation:");
assert(project.transcript.text === locked, "locked transcript preserved verbatim");
assert(
  project.dialogue_timeline.map((d) => d.text).join(" ") === locked,
  "dialogue segmentation reassembles to the exact locked text"
);
assert(project.timeline.length > 0, `timeline has ${project.timeline.length} events`);
assert(project.timeline.every((e) => e.end <= 15.2 + 0.05), "all events within duration");
assert(project.timeline.every((e) => !!e.reason), "every event has a semantic reason");
assert(project.captions?.enabled === true, "captions module included");
assert(project.sound_design?.enabled === true, "sound design module included");
assert(project.constraints.no_wardrobe_change === true, "wardrobe constraint set from preservation");

console.log("Validation (clean project):");
const clean = validateProject(project);
assert(clean[0].severity !== "ERROR", `overall = ${clean[0].severity}`);
assert(
  clean.some((r) => r.title === "Transcript Integrity" && r.severity === "PASS"),
  "transcript integrity PASS"
);

console.log("Validation (corrupted transcripts):");
const dup = compareTranscriptTokens(locked, locked.replace("burung pipit", "burung pipit pipit"));
assert(dup.some((r) => r.severity === "ERROR" && /Duplicated/.test(r.title)), "duplicated word detected");
const missing = compareTranscriptTokens(locked, locked.replace("pakai AI, ", ""));
assert(missing.some((r) => r.severity === "ERROR" && /Missing/.test(r.title)), "missing words detected");
const inserted = compareTranscriptTokens(locked, locked.replace("pakai AI", "pakai teknologi AI"));
assert(inserted.some((r) => r.severity === "ERROR"), "inserted word detected");

console.log("Validation (structural corruption):");
const broken = structuredClone(project) as any;
broken.timeline[0].end = 99;
broken.dialogue_timeline[0].speaker_id = "speaker_99";
const res = validateProject(broken);
assert(res.some((r) => r.title === "Event Outside Video Duration"), "out-of-bounds event detected");
assert(res.some((r) => r.title === "Invalid Speaker Reference"), "invalid speaker ref detected");

console.log("Preset library:");
assert(BUILTIN_PRESETS.length >= 30, `${BUILTIN_PRESETS.length} built-in presets`);
assert(
  new Set(BUILTIN_PRESETS.map((p) => p.id)).size === BUILTIN_PRESETS.length,
  "all preset ids unique"
);

console.log("Prompt + adapters:");
const human = generateHumanPrompt(project);
assert(human.includes(locked), "human prompt embeds locked dialogue");
for (const section of [
  "Preserve the original speaker exactly as filmed",
  "original clothing",
  "Do NOT summarize.",
  "Do NOT translate.",
  "Caption behavior:",
  "Never cover the speaker's face.",
  "Enhance the video with premium editing:",
  "Create immersive cinematic sound design:",
  "Background music:",
  "Negative Constraints:",
  "Do NOT change the speaker's clothing or wardrobe colors.",
  "Final output should look like",
]) {
  assert(human.includes(section), `prompt contains "${section.slice(0, 40)}"`);
}

// Faithfulness: a disabled module must not appear in the prompt.
const noMusic = structuredClone(project);
delete (noMusic as any).background_music;
assert(
  !generateHumanPrompt(noMusic).includes("Background music:"),
  "music section omitted when the module is absent"
);
const noPreserve = structuredClone(project);
noPreserve.speaker_preservation.clothing = false;
noPreserve.constraints.no_wardrobe_change = false;
const npText = generateHumanPrompt(noPreserve);
assert(
  !npText.includes("original clothing") &&
    !npText.includes("Do NOT change the speaker's clothing"),
  "wardrobe lines omitted when clothing preservation is off"
);

console.log("\n──────── GENERATED PROMPT ────────\n");
console.log(human);
console.log("\n──────────────────────────────────\n");
for (const a of ADAPTERS) {
  const out = a.transform(project);
  assert(out.content.length > 100, `adapter ${a.id} produces output`);
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAll smoke tests passed.");
