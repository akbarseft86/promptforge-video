import { generateUniversalProject } from "../src/services/generation";
import { validateProject, compareTranscriptTokens } from "../src/features/validator/validate";
import { generateHumanPrompt } from "../src/services/humanPrompt";
import { ADAPTERS } from "../src/adapters";
import { BUILTIN_PRESETS } from "../src/features/presets/presets";
import { applyOverrides } from "../src/stores/project";

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

console.log("No-transcript safety (captions requested, none available):");
const noTranscript = generateUniversalProject({
  projectName: "Creator Reel",
  instructions:
    "Make this a premium reel with word-for-word captions, B-roll, and sound effects.",
  customStyle: "",
  preset: BUILTIN_PRESETS[0],
  transcriptMode: "none",
  manualTranscript: "",
  autoTranscript: "",
  speakers: [{ id: "speaker_1", label: "Creator" }],
  preservation: {
    identity: true, voice: true, lip_sync: true, facial_expression: true,
    body_language: true, clothing: true, original_colors: true,
    body_proportions: true, original_language: true, camera_perspective: false,
  },
  source: { media_type: "video", duration_seconds: 8.33, aspect_ratio: "4:5" },
  platformTargets: ["instagram_reels"],
});
assert(!noTranscript.captions, "captions module NOT created without a transcript");
assert(
  !noTranscript.timeline.some((e) => e.text_source === "locked_transcript"),
  "no timeline event quotes an empty transcript"
);
assert(
  noTranscript.transcription_requirement?.required === true,
  "transcription requirement flagged instead"
);
const ntPrompt = generateHumanPrompt(noTranscript);
assert(
  ntPrompt.includes("THE ON-SCREEN TEXT MUST MATCH THE SPOKEN AUDIO EXACTLY"),
  "prompt leads with the audio-match requirement"
);
assert(
  ntPrompt.includes("TRANSCRIBE what is actually spoken, word for word"),
  "prompt orders the model to transcribe from audio"
);
assert(
  ntPrompt.includes("VERIFY before rendering"),
  "prompt requires re-checking the transcription against the audio"
);
assert(
  /1\..*\n2\..*\n3\./s.test(ntPrompt),
  "protocol steps are sequentially numbered"
);
assert(
  ntPrompt.includes("Do NOT invent dialogue.") &&
    ntPrompt.includes("Do NOT omit any word that IS spoken.") &&
    ntPrompt.includes("Do NOT duplicate a word that is spoken only once."),
  "prompt forbids inventing, omitting, and duplicating words"
);
assert(
  !ntPrompt.includes("perfect word-for-word transcription of the speaker's dialogue"),
  "prompt does not claim a verbatim source that does not exist"
);
const ntVal = validateProject(noTranscript);
assert(
  ntVal.some((r) => r.title === "Transcription Delegated To Video Model"),
  "validator warns transcription is delegated"
);
const fakeCaptions = structuredClone(noTranscript) as any;
fakeCaptions.captions = {
  enabled: true, source: "locked_transcript", word_for_word: true,
  word_synchronized: true, prevent_face_overlap: true,
  allow_future_dialogue: false, kinetic_typography: true,
};
assert(
  validateProject(fakeCaptions).some((r) => r.title === "Captions Without Transcript"),
  "validator errors on captions with an empty transcript"
);

console.log("Talking-head framing and subject sharpness:");
const th = generateUniversalProject({
  projectName: "TH", instructions: "", customStyle: "",
  preset: BUILTIN_PRESETS.find((x) => x.id === "tech_ai_futuristic")!,
  transcriptMode: "auto", manualTranscript: "", autoTranscript: "",
  speakers: [{ id: "speaker_1", label: "Speaker 1" }],
  preservation: {
    identity: true, voice: true, lip_sync: true, facial_expression: true,
    body_language: true, clothing: true, original_colors: true,
    body_proportions: true, original_language: true, camera_perspective: false,
  },
  source: { media_type: "video", duration_seconds: 8.33, aspect_ratio: "4:5" },
  platformTargets: ["instagram_reels"],
});
const thText = generateHumanPrompt(th);
assert(
  thText.startsWith("Transform this raw talking-head video"),
  "a preserved on-camera speaker reads as talking-head, with or without a transcript"
);
assert(
  thText.includes("IMAGE FIDELITY — THE SPEAKER MUST STAY SHARP"),
  "sharpness block present when a person must survive the edit"
);
assert(
  thText.indexOf("IMAGE FIDELITY") < thText.indexOf("Replace the original background"),
  "sharpness is stated before background replacement, not after"
);
assert(
  thText.includes("BACKGROUND ONLY") &&
    thText.includes("Do NOT blur, soften, or defocus the speaker"),
  "depth effects are scoped to background and subject blur is forbidden"
);
assert(
  !/Use subtle depth, perspective, parallax, glow, and blur/.test(thText),
  "caption behavior no longer instructs a blanket blur"
);

// Text-only projects must not claim footage that does not exist.
const concept = generateUniversalProject({
  projectName: "C", instructions: "captions", customStyle: "",
  preset: BUILTIN_PRESETS[0], transcriptMode: "auto",
  manualTranscript: "", autoTranscript: "",
  speakers: [{ id: "speaker_1", label: "S" }],
  preservation: {
    identity: true, voice: true, lip_sync: true, facial_expression: true,
    body_language: true, clothing: true, original_colors: true,
    body_proportions: true, original_language: true, camera_perspective: false,
  },
  source: { media_type: "text_only" },
  platformTargets: ["instagram_reels"], targetDurationSeconds: 15,
});
const conceptText = generateHumanPrompt(concept);
// The downstream tool is where footage gets attached, so preservation being
// on must still read as real footage — calling it a "concept" invites the
// model to generate a new person instead of editing the one on camera.
assert(
  conceptText.startsWith("Transform this raw talking-head video"),
  "preserving a speaker reads as footage even when this app holds no file"
);
assert(
  !conceptText.includes("Transform this concept"),
  "a preserved speaker is never described as a concept"
);
assert(
  conceptText.includes("Preserve the original speaker exactly as filmed"),
  "preservation keeps its direct phrasing"
);
assert(
  conceptText.includes("attached source video"),
  "the transcription protocol points at the clip the user attaches downstream"
);

console.log("Preset-only project (no video, no text, no instructions):");
const presetOnly = generateUniversalProject({
  projectName: "Preset Only",
  instructions: "",
  customStyle: "",
  preset: BUILTIN_PRESETS[0],
  transcriptMode: "none",
  manualTranscript: "",
  autoTranscript: "",
  speakers: [{ id: "speaker_1", label: "Speaker 1" }],
  preservation: {
    identity: true, voice: true, lip_sync: true, facial_expression: true,
    body_language: true, clothing: true, original_colors: true,
    body_proportions: true, original_language: true, camera_perspective: false,
  },
  source: { media_type: "text_only" },
  platformTargets: ["instagram_reels"],
  targetDurationSeconds: 20,
});
assert(presetOnly.timeline.length > 0, `timeline planned (${presetOnly.timeline.length} events)`);
assert(
  presetOnly.output.target_duration_seconds === 20,
  "intended length recorded as output.target_duration_seconds"
);
assert(
  presetOnly.timeline.every((e) => e.end <= 20.01),
  "planned events stay within the target duration"
);
assert(
  validateProject(presetOnly)[0].severity !== "ERROR",
  `preset-only project validates (${validateProject(presetOnly)[0].severity})`
);
assert(
  generateHumanPrompt(presetOnly).length > 400,
  "preset-only project still yields a full prompt"
);

console.log("Preset overrides:");
{
  const base = BUILTIN_PRESETS.find((x) => x.id === "cinematic_creator")!;
  const tweaked = applyOverrides(base, {
    editing: { pacing: "relaxed", punch_in_frequency: "off" },
    sfxIntensity: "low",
    backgroundReplacement: false,
  });
  assert(
    base.editing.pacing === "high_retention" && base.sound_design.intensity === "medium",
    "overriding never mutates the underlying preset"
  );
  assert(
    tweaked.editing.pacing === "relaxed" &&
      tweaked.sound_design.intensity === "low" &&
      tweaked.background_replacement_default === false,
    "overrides land on the effective preset"
  );
  assert(
    applyOverrides(base, {}) === base,
    "an empty override set returns the preset unchanged"
  );
  const mk = (preset: typeof base) =>
    generateUniversalProject({
      projectName: "T", instructions: "", customStyle: "", preset,
      transcriptMode: "none", manualTranscript: "", autoTranscript: "",
      speakers: [{ id: "speaker_1", label: "S" }],
      preservation: {
        identity: true, voice: true, lip_sync: true, facial_expression: true,
        body_language: true, clothing: true, original_colors: true,
        body_proportions: true, original_language: true, camera_perspective: false,
      },
      source: { media_type: "text_only" },
      platformTargets: ["tiktok"], targetDurationSeconds: 20,
    });
  const tweakedProject = mk(tweaked);
  assert(
    tweakedProject.editing.pacing === "relaxed" &&
      tweakedProject.visual_direction.background_replacement === false,
    "overrides reach the generated JSON, not just the UI"
  );
  assert(
    tweakedProject.sound_design?.intensity === "low",
    "low sound design stays audible rather than being dropped"
  );
  assert(
    mk(BUILTIN_PRESETS.find((x) => x.id === "minimal_clean")!).sound_design === undefined,
    "a preset with an empty SFX palette still opts out of sound design"
  );
}

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

// The spoken lines must close the prompt, not sit in its middle.
{
  assert(
    human.indexOf(locked) > human.indexOf("Final output should look like"),
    "the locked transcript is the final block of the prompt"
  );
  assert(
    human.lastIndexOf("LOCKED TRANSCRIPT —") > human.indexOf("Negative Constraints:"),
    "transcript comes after the styling and constraint sections"
  );
  assert(
    human.includes("supplied at the very end of this prompt"),
    "the captions section points forward to it"
  );
  assert(
    human.split(locked).length - 1 === 1,
    "the transcript text appears exactly once"
  );
}

// Locked-transcript path must also demand a verbatim self-check.
assert(
  human.includes("single source of truth for every on-screen word") &&
    human.includes("same words, same order, same count"),
  "locked-transcript prompt demands an exact verbatim self-check"
);

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
