import { generateUniversalProject } from "../src/services/generation";
import { validateProject, compareTranscriptTokens } from "../src/features/validator/validate";
import { generateHumanPrompt } from "../src/services/humanPrompt";
import { ADAPTERS } from "../src/adapters";
import { BUILTIN_PRESETS } from "../src/features/presets/presets";
import { applyOverrides } from "../src/stores/project";
import { fixFor, safeFixes } from "../src/features/validator/autofix";
import { CHARACTER_ARCHETYPES } from "../src/features/characters/archetypes";
import { characterSheet, missingIdentityTraits } from "../src/features/characters/sheet";
import { CharacterSchema } from "../src/schemas/universal";
import { SHIPPED_CHARACTERS } from "../src/features/characters/library";

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
  ntPrompt.includes("The on-screen text must match the spoken audio exactly."),
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
  thText.includes("Image fidelity — the speaker must stay sharp"),
  "sharpness block present when a person must survive the edit"
);
assert(
  thText.indexOf("Image fidelity") < thText.indexOf("Replace the original background"),
  "sharpness is stated before background replacement, not after"
);
assert(
  thText.includes("BACKGROUND ONLY") &&
    thText.includes("Keep the speaker tack sharp"),
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
  "Final output should look like",
]) {
  assert(human.includes(section), `prompt contains "${section.slice(0, 40)}"`);
}

// Each rule is stated once. Repeating locks on a real person's face and
// voice across three sections reads as insistence rather than specification.
{
  const countOf = (needle: string) => human.split(needle).length - 1;
  // Each lock is named once, in the preservation list — the closing
  // constraint list must not restate it. ("original voice" legitimately
  // recurs under sound mixing, which is a different instruction.)
  for (const [restated, label] of [
    ["Do NOT modify the original voice", "voice"],
    ["Do NOT alter lip sync", "lip sync"],
    ["Do NOT alter the speaker's body proportions", "body proportions"],
    ["Do NOT change the speaker's clothing", "wardrobe"],
    ["Do NOT change the speaker's identity", "identity"],
  ] as const) {
    assert(countOf(restated) === 0, `${label} lock is not restated as a prohibition`);
  }
  for (const attr of ["original voice", "original lip sync", "original clothing"]) {
    assert(human.includes(attr), `${attr} is still stated in the preservation list`);
  }
  const prohibitions = human.split("\n").filter((l) => /do not/i.test(l)).length;
  assert(
    prohibitions <= 20,
    `prohibition count stays moderate (${prohibitions} lines)`
  );
  assert(
    !/^[A-Z][A-Z ,—-]{15,}$/m.test(human),
    "no shouted all-caps section headers"
  );
}

// Optional sections must be genuinely optional, so a refusing tool can be
// bisected without hand-editing the prompt.
{
  assert(
    !human.includes("Timeline directions:"),
    "timestamped timeline is omitted by default"
  );
  assert(
    generateHumanPrompt(project, { includeTimeline: true }).includes(
      "Timeline directions:"
    ),
    "timeline can be switched back on"
  );
  assert(
    human.includes("Image fidelity — the speaker must stay sharp"),
    "fidelity block is on by default"
  );
  assert(
    !generateHumanPrompt(project, { includeFidelity: false }).includes(
      "Image fidelity"
    ),
    "fidelity block can be switched off"
  );
  // Turning a section off must not silently drop its rules from the JSON.
  assert(
    project.image_fidelity?.preserve_subject_sharpness === true &&
      project.timeline.length > 0,
    "the underlying JSON keeps both regardless of prompt options"
  );
}

// The spoken lines must close the prompt, not sit in its middle.
{
  assert(
    human.indexOf(locked) > human.indexOf("Final output should look like"),
    "the locked transcript is the final block of the prompt"
  );
  assert(
    human.lastIndexOf("The speaker says the following dialogue") >
      human.indexOf("Negative Constraints:"),
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
  human.includes("exactly this spelling and word order") &&
    human.includes("There must be no duplicated words.") &&
    human.includes("There must be no missing words."),
  "locked-transcript prompt pins spelling, order, and word count"
);
assert(
  !human.includes("matches what is spoken in the attached video") &&
    !human.includes("Align it to the audio"),
  "the prompt does not ask the model to analyse the speaker's recorded voice"
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

// ──────── characters ────────
{
  const cast = generateUniversalProject({
    projectName: "Cast",
    instructions: "cinematic product story",
    customStyle: "",
    preset: BUILTIN_PRESETS[0],
    transcriptMode: "none",
    manualTranscript: "",
    autoTranscript: "",
    speakers: [{ id: "speaker_1", label: "Speaker 1" }],
    characters: [
      {
        id: "character_1",
        name: "Maya",
        appearance: "South Asian woman, shoulder-length black hair, warm brown eyes",
        role: "founder",
        age_range: "30s",
        wardrobe: "charcoal blazer over a white tee",
        voice: "low, unhurried",
        lock_across_shots: true,
      },
    ],
    preservation: project.speaker_preservation,
    source: { media_type: "text_only" },
    platformTargets: ["instagram_reels"],
    targetDurationSeconds: 20,
  });

  assert(cast.characters?.length === 1, "character reaches the Universal JSON");
  assert(
    validateProject(cast).every((r) => r.title !== "Schema Violation"),
    "a project with characters is schema-valid"
  );

  const castPrompt = generateHumanPrompt(cast);
  assert(castPrompt.includes("Maya"), "the character is named in the prompt");
  assert(
    castPrompt.includes("South Asian woman"),
    "the appearance reaches the prompt"
  );
  assert(
    castPrompt.includes("charcoal blazer"),
    "the wardrobe reaches the prompt"
  );
  assert(
    /CHARACTER LOCK/.test(castPrompt) &&
      /in every shot and every clip/i.test(castPrompt),
    "a locked character demands consistency across shots and clips"
  );
  // Nobody was filmed, so claiming a filmed source invites a second person.
  assert(
    !/exactly as filmed/i.test(castPrompt),
    "an invented cast is never described as filmed"
  );

  // Omitted rather than empty when there is no cast.
  const noCast = generateUniversalProject({
    projectName: "No cast",
    instructions: "cinematic product story",
    customStyle: "",
    preset: BUILTIN_PRESETS[0],
    transcriptMode: "none",
    manualTranscript: "",
    autoTranscript: "",
    speakers: [{ id: "speaker_1", label: "Speaker 1" }],
    characters: [],
    preservation: project.speaker_preservation,
    source: { media_type: "text_only" },
    platformTargets: ["instagram_reels"],
    targetDurationSeconds: 20,
  });
  assert(
    noCast.characters === undefined,
    "an empty cast is omitted from the JSON, not emitted as []"
  );

  // An unlocked character should be called out, not silently accepted.
  const drifting = structuredClone(cast);
  drifting.characters![0].lock_across_shots = false;
  assert(
    validateProject(drifting).some(
      (r) => r.title === "Character Not Locked Across Shots"
    ),
    "an unlocked character raises a warning"
  );

  // A link to a speaker that does not exist is an error, not a warning.
  const dangling = structuredClone(cast);
  dangling.characters![0].speaker_id = "speaker_9";
  assert(
    validateProject(dangling).some(
      (r) =>
        r.title === "Character Links To Missing Speaker" && r.severity === "ERROR"
    ),
    "a dangling speaker link is an error"
  );
}

// ──────── character sheet: the cross-clip consistency contract ────────
{
  const maya = {
    id: "character_1" as const,
    name: "Maya",
    appearance: "athletic build, high cheekbones, calm steady expression",
    role: "founder",
    age_range: "early 30s",
    gender: "woman",
    ethnicity: "Indonesian",
    skin_tone: "golden brown",
    eye_color: "dark brown",
    hair: "long black straight",
    distinguishing_features: "small scar above the left eyebrow",
    wardrobe: "charcoal blazer over a white tee",
    voice: "low, unhurried",
    mannerisms: "talks with open hands",
    seed: "884213",
    lock_across_shots: true,
  };

  // The whole feature rests on this: same input, byte-identical output. If the
  // sheet is not stable, the character is not stable.
  assert(
    characterSheet(maya) === characterSheet({ ...maya }),
    "the same character always renders a byte-identical sheet"
  );
  // Field order must not follow object key order, or reordering the form
  // fields would silently change every future clip.
  const shuffled = JSON.parse(
    JSON.stringify({
      lock_across_shots: true,
      hair: maya.hair,
      name: maya.name,
      seed: maya.seed,
      appearance: maya.appearance,
      gender: maya.gender,
      role: maya.role,
      ethnicity: maya.ethnicity,
      skin_tone: maya.skin_tone,
      eye_color: maya.eye_color,
      distinguishing_features: maya.distinguishing_features,
      wardrobe: maya.wardrobe,
      voice: maya.voice,
      mannerisms: maya.mannerisms,
      age_range: maya.age_range,
      id: maya.id,
    })
  );
  assert(
    characterSheet(shuffled) === characterSheet(maya),
    "sheet order is fixed regardless of key order"
  );

  const sheet = characterSheet(maya);
  for (const [label, value] of [
    ["Gender", "woman"],
    ["Ethnicity", "Indonesian"],
    ["Skin tone", "golden brown"],
    ["Eyes", "dark brown"],
    ["Hair", "long black straight"],
    ["Seed", "884213"],
  ] as const) {
    assert(sheet.includes(`${label}: ${value}`), `sheet carries ${label}`);
  }

  // A blank field must be dropped: an empty label reads as "unspecified" and
  // invites the model to fill it differently on each run.
  const sparse = characterSheet({
    id: "character_1",
    name: "Ghost",
    appearance: "tall and thin",
    lock_across_shots: true,
  });
  assert(!/:\s*$/m.test(sparse), "blank traits are omitted, never left empty");

  assert(
    missingIdentityTraits(maya).length === 0,
    "a fully specified character reports no missing traits"
  );
  assert(
    missingIdentityTraits({
      id: "character_1",
      name: "Ghost",
      appearance: "tall and thin",
      lock_across_shots: true,
    }).length === 5,
    "an unspecified character reports every missing identity trait"
  );

  // The prompt must reuse the shared builder verbatim, not re-describe the
  // character in its own words.
  const withMaya = generateUniversalProject({
    projectName: "Scene 1",
    instructions: "rooftop at sunset",
    customStyle: "",
    preset: BUILTIN_PRESETS[0],
    transcriptMode: "none",
    manualTranscript: "",
    autoTranscript: "",
    speakers: [{ id: "speaker_1", label: "Speaker 1" }],
    characters: [maya],
    preservation: project.speaker_preservation,
    source: { media_type: "text_only" },
    platformTargets: ["instagram_reels"],
    targetDurationSeconds: 10,
  });
  const promptText = generateHumanPrompt(withMaya);
  assert(
    promptText.includes(characterSheet(maya)),
    "the prompt embeds the sheet verbatim"
  );
  assert(
    /every other clip/i.test(promptText),
    "the lock spans clips, not just shots within one clip"
  );

  // Two different scenes must carry the identical sheet — that is the entire
  // point when a long piece is stitched from separate short generations.
  const scene2 = generateUniversalProject({
    projectName: "Scene 2",
    instructions: "completely different setting, a kitchen at night",
    customStyle: "moody",
    preset: BUILTIN_PRESETS[2],
    transcriptMode: "none",
    manualTranscript: "",
    autoTranscript: "",
    speakers: [{ id: "speaker_1", label: "Speaker 1" }],
    characters: [maya],
    preservation: project.speaker_preservation,
    source: { media_type: "text_only" },
    platformTargets: ["tiktok"],
    targetDurationSeconds: 10,
  });
  assert(
    generateHumanPrompt(scene2).includes(characterSheet(maya)),
    "a different scene carries the same sheet unchanged"
  );
}

// ──────── shipped characters ────────
{
  // Every shipped character must survive the same round trip a user's
  // library does, or it would be dropped silently on their machine.
  for (const c of SHIPPED_CHARACTERS) {
    assert(
      CharacterSchema.safeParse(c).success,
      `shipped character "${c.name}" is schema-valid`
    );
    assert(
      characterSheet(c).includes(c.name),
      `shipped character "${c.name}" renders a sheet`
    );
  }
  assert(
    new Set(SHIPPED_CHARACTERS.map((c) => c.id)).size ===
      SHIPPED_CHARACTERS.length,
    "shipped character ids are unique"
  );
  // The library merges by name, so a duplicate would overwrite the other on
  // every user's machine rather than shipping two characters.
  assert(
    new Set(SHIPPED_CHARACTERS.map((c) => c.name.trim().toLowerCase())).size ===
      SHIPPED_CHARACTERS.length,
    "shipped character names are unique"
  );
}

// ──────── character archetypes ────────
{
  assert(CHARACTER_ARCHETYPES.length > 0, "archetypes are available to pick");
  assert(
    new Set(CHARACTER_ARCHETYPES.map((a) => a.id)).size ===
      CHARACTER_ARCHETYPES.length,
    "archetype ids are unique"
  );

  for (const a of CHARACTER_ARCHETYPES) {
    // An archetype whose appearance is blank would fail the schema the moment
    // it is picked, which is worse than offering no template at all.
    assert(
      a.fields.appearance.trim().length > 0,
      `archetype "${a.label}" has an appearance`
    );
    const parsed = CharacterSchema.safeParse({
      id: "character_1",
      name: a.label,
      appearance: a.fields.appearance,
      role: a.fields.role || undefined,
      age_range: a.fields.age_range || undefined,
      wardrobe: a.fields.wardrobe || undefined,
      voice: a.fields.voice || undefined,
      mannerisms: a.fields.mannerisms || undefined,
      lock_across_shots: true,
    });
    assert(parsed.success, `archetype "${a.label}" produces a valid character`);
  }

  // Picking one must actually reach the prompt, not just the form.
  const picked = CHARACTER_ARCHETYPES.find((a) => a.id === "fitness_coach")!;
  const withArchetype = generateUniversalProject({
    projectName: "Archetype",
    instructions: "gym promo",
    customStyle: "",
    preset: BUILTIN_PRESETS[0],
    transcriptMode: "none",
    manualTranscript: "",
    autoTranscript: "",
    speakers: [{ id: "speaker_1", label: "Speaker 1" }],
    characters: [
      {
        id: "character_1",
        name: picked.label,
        appearance: picked.fields.appearance,
        wardrobe: picked.fields.wardrobe,
        lock_across_shots: true,
      },
    ],
    preservation: project.speaker_preservation,
    source: { media_type: "text_only" },
    platformTargets: ["tiktok"],
    targetDurationSeconds: 15,
  });
  const archetypePrompt = generateHumanPrompt(withArchetype);
  assert(
    archetypePrompt.includes("athletic muscular build"),
    "a picked archetype's appearance reaches the prompt"
  );
  assert(
    validateProject(withArchetype).every((r) => r.title !== "Schema Violation"),
    "a picked archetype yields a schema-valid project"
  );
}

// ──────── auto-fix ────────
// Each fix must actually clear the finding it is offered for, and must never
// introduce a new error.
const findingTitles = (p: any) => validateProject(p).map((r) => r.title);

{
  // Constraint drift: the fix reconciles the two fields.
  const drifted = structuredClone(project);
  drifted.constraints.no_wardrobe_change = !drifted.speaker_preservation.clothing;
  const drift = validateProject(drifted).find(
    (r) => r.title === "Constraint Drift — Wardrobe"
  );
  assert(!!drift, "constraint drift is detected");
  const fix = fixFor(drift!, drifted);
  assert(!!fix && !fix.lossy, "constraint drift has a non-lossy fix");
  const fixed = fix!.apply(structuredClone(drifted));
  assert(
    !findingTitles(fixed).includes("Constraint Drift — Wardrobe"),
    "constraint drift fix clears the finding"
  );
}

{
  // Aspect ratio: vertical platforms get 9:16.
  const wrongRatio = structuredClone(project);
  wrongRatio.output.aspect_ratio = "16:9";
  const finding = validateProject(wrongRatio).find(
    (r) => r.title === "Aspect Ratio vs Platform"
  );
  assert(!!finding, "aspect ratio mismatch is detected");
  const fixed = fixFor(finding!, wrongRatio)!.apply(structuredClone(wrongRatio));
  assert(fixed.output.aspect_ratio === "9:16", "aspect ratio fix sets 9:16");
  assert(
    !findingTitles(fixed).includes("Aspect Ratio vs Platform"),
    "aspect ratio fix clears the finding"
  );
}

{
  // Negative durations are swapped, not dropped.
  const inverted = structuredClone(project);
  if (inverted.timeline.length) {
    const e = inverted.timeline[0];
    const [a, b] = [e.start, e.end];
    e.start = b + 1;
    e.end = a;
    const finding = validateProject(inverted).find(
      (r) => r.title === "Negative Event Duration"
    );
    assert(!!finding, "negative duration is detected");
    const fixed = fixFor(finding!, inverted)!.apply(structuredClone(inverted));
    assert(
      fixed.timeline.length === inverted.timeline.length,
      "negative duration fix keeps every event"
    );
    assert(
      !findingTitles(fixed).includes("Negative Event Duration"),
      "negative duration fix clears the finding"
    );
  }
}

{
  // Effect density: thinning terminates and reaches the limit.
  const dense = structuredClone(project);
  const duration = dense.source.duration_seconds ?? 30;
  dense.timeline = Array.from({ length: 40 }, (_, i) => ({
    id: `dense_${i}`,
    start: Number(((i % 20) * 0.2).toFixed(2)),
    end: Number(((i % 20) * 0.2 + 0.4).toFixed(2)),
    type: "emphasis" as const,
    intensity: (i % 10) / 10,
  })).filter((e) => e.end <= duration);
  const denseFindings = validateProject(dense);
  assert(
    !denseFindings.some((r) => r.title === "Schema Violation"),
    "density fixture is schema-valid"
  );
  const finding = denseFindings.find((r) => r.title === "High Effect Density");
  assert(!!finding, "high effect density is detected");
  const fix = fixFor(finding!, dense)!;
  assert(fix.lossy, "density fix is flagged lossy");
  const fixed = fix.apply(structuredClone(dense));
  assert(
    !findingTitles(fixed).includes("High Effect Density"),
    "density fix clears the finding"
  );
  assert(
    fixed.timeline.length < dense.timeline.length,
    "density fix removes events"
  );
}

{
  // Transcript-dependent text: the delegated-transcription warning clears, and
  // nothing is left quoting a transcript that does not exist.
  const delegated = generateUniversalProject({
    projectName: "Autofix",
    instructions: "add bold on-screen captions throughout",
    customStyle: "",
    preset: BUILTIN_PRESETS[0],
    transcriptMode: "none",
    manualTranscript: "",
    autoTranscript: "",
    speakers: [{ id: "speaker_1", label: "Speaker 1" }],
    preservation: project.speaker_preservation,
    source: { media_type: "video", duration_seconds: 30 },
    platformTargets: ["tiktok"],
    targetDurationSeconds: 30,
  });
  const finding = validateProject(delegated).find(
    (r) => r.title === "Transcription Delegated To Video Model"
  );
  if (finding) {
    const fix = fixFor(finding, delegated)!;
    assert(fix.lossy, "removing on-screen text is flagged lossy");
    const fixed = fix.apply(structuredClone(delegated));
    assert(
      !findingTitles(fixed).includes("Transcription Delegated To Video Model"),
      "on-screen text fix clears the delegated-transcription warning"
    );
    assert(
      !fixed.timeline.some((e) => e.text_source === "locked_transcript"),
      "on-screen text fix leaves nothing quoting the locked transcript"
    );
  }
}

{
  // "Fix all safe issues" applies only non-lossy repairs and converges.
  const messy = structuredClone(project);
  messy.constraints.no_wardrobe_change = !messy.speaker_preservation.clothing;
  messy.output.aspect_ratio = "16:9";
  messy.audio.preserve_original_voice = !messy.speaker_preservation.voice
    ? messy.audio.preserve_original_voice
    : false;

  let cur: any = messy;
  let applied = 0;
  for (let pass = 0; pass < 12; pass++) {
    const pending = safeFixes(validateProject(cur), cur);
    if (!pending.length) break;
    cur = pending[0].apply(structuredClone(cur));
    applied++;
  }
  assert(applied >= 2, "fix-all applies multiple safe repairs");
  assert(
    safeFixes(validateProject(cur), cur).length === 0,
    "fix-all converges with no safe fixes left"
  );
  assert(
    !validateProject(cur).some(
      (r) => r.severity === "ERROR" && r.title === "Schema Violation"
    ),
    "fix-all never breaks the schema"
  );
}

{
  // Findings that would require inventing dialogue must offer no fix.
  const mismatch: any = structuredClone(project);
  mismatch.dialogue_timeline = [
    { speaker_id: "speaker_1", start: 0, end: 1, text: "totally different words" },
  ];
  for (const r of validateProject(mismatch)) {
    if (r.title.startsWith("Transcript Mismatch")) {
      assert(
        fixFor(r, mismatch) === null,
        `no auto-fix is offered for "${r.title}"`
      );
    }
  }
  assert(
    fixFor({ severity: "PASS", title: "Overall", detail: "" }, project) === null,
    "the Overall summary offers no fix"
  );
}

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
