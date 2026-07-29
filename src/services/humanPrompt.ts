import { UniversalVideoProject } from "../schemas/universal";
import {
  PRESERVATION_PHRASES,
  EDITING_PHRASES,
  CAMERA_MOVE_PHRASES,
  VISUAL_EFFECT_PHRASES,
  MOTION_ELEMENT_PHRASES,
  SFX_PHRASES,
  CONSTRAINT_PHRASES,
  CAPTION_POSITION_PHRASES,
  CAPTION_ANIMATION_PHRASES,
  PLATFORM_PHRASES,
  PACING_PHRASES,
  joinNatural,
  phrasesFor,
} from "./vocabulary";

/**
 * Renders the Universal JSON as a production-grade natural-language prompt.
 *
 * Every sentence is gated on a field that is actually present and enabled in
 * the JSON — the prompt never introduces a requirement the JSON does not
 * contain, and never drops a locked constraint the JSON does contain.
 */
export interface PromptOptions {
  /**
   * Timestamped per-event directions. Off by default: the documented Gemini
   * Omni workflow generates 8–10s at a time, so a timeline spanning a whole
   * clip cannot be honoured, and asking for it invites a capability refusal.
   */
  includeTimeline?: boolean;
  /** The subject-sharpness block. */
  includeFidelity?: boolean;
}

export function generateHumanPrompt(
  p: UniversalVideoProject,
  options: PromptOptions = {}
): string {
  const { includeTimeline = false, includeFidelity = true } = options;
  const blocks: string[] = [];
  const bullets = (items: string[]) => items.map((i) => `• ${i}`).join("\n");

  // A rule stated once reads as a specification; the same rule restated in
  // three sections reads as insistence, and a wall of prohibitions around a
  // real person's face and voice resembles the shape of a request video
  // models refuse. Sections mark what they already cover so the closing
  // constraint list carries only what is left.
  type ConstraintKey = keyof typeof p.constraints;
  const covered = new Set<ConstraintKey>();
  const cover = (...keys: ConstraintKey[]) => keys.forEach((k) => covered.add(k));

  // ---------- 1. Opening transformation statement ----------
  const hasVideo = p.source.media_type === "video";
  // Someone is speaking on camera whenever the edit is built around keeping a
  // speaker intact — not merely when a transcript happens to be available.
  // A talking head is a person whose likeness must survive the edit — that is
  // what preservation locks encode. Needing a transcript only proves there is
  // audio, which is a weaker claim, so the two are kept apart.
  const speakerOnCamera =
    p.speakers.length > 0 &&
    (p.speaker_preservation.identity ||
      p.speaker_preservation.lip_sync ||
      p.speaker_preservation.voice ||
      p.speaker_preservation.facial_expression);
  const hasSpokenContent =
    p.transcript.source !== "none" ||
    p.transcription_requirement?.required === true;

  // Preserving a real speaker only makes sense against real footage. Whether
  // THIS app holds the file is an app-side detail — the prompt is pasted into
  // a tool where the user attaches the clip — so preservation being on is
  // enough to describe the input as footage. Calling it a "concept" tells the
  // video model there is no source, inviting it to generate a new person
  // instead of editing the one on camera.
  const editsFootage = hasVideo || speakerOnCamera || hasSpokenContent;
  const subject = !editsFootage
    ? "concept"
    : p.speakers.length > 1
      ? "raw multi-speaker video"
      : speakerOnCamera
        ? "raw talking-head video"
        : "raw source video";

  const quality = p.output.style_quality === "premium" ? "premium" : "polished";
  const retention =
    p.editing.pacing === "high_retention" || p.editing.pacing === "fast"
      ? "high-retention "
      : "";
  const format = p.output.platform_targets.some((t) =>
    ["instagram_reels", "tiktok", "youtube_shorts"].includes(t)
  )
    ? "social media reel"
    : "social video";

  const openingFeatures: string[] = [];
  if (p.editing.transitions || p.editing.punch_ins || p.editing.dynamic_zoom)
    openingFeatures.push("cinematic editing");
  if (p.sound_design?.enabled) openingFeatures.push("immersive sound design");
  if (p.motion_graphics?.enabled) openingFeatures.push("luxury motion graphics");
  openingFeatures.push(`professional ${p.visual_direction.style} visuals`);

  blocks.push(
    `Transform this ${subject} into a ${quality}, ${retention}${format} with ${joinNatural(openingFeatures)}.`
  );

  // ---------- 2. Preservation ----------
  const preserved = (
    Object.keys(p.speaker_preservation) as (keyof typeof p.speaker_preservation)[]
  )
    .filter((k) => p.speaker_preservation[k])
    .map((k) => PRESERVATION_PHRASES[k])
    .filter(Boolean);

  if (preserved.length) {
    blocks.push(
      editsFootage
        ? `Preserve the original speaker exactly as filmed. Keep the ${joinNatural(preserved)} unchanged.`
        : `Preserve the speaker exactly as filmed: keep the ${joinNatural(preserved)} unchanged.`
    );
    // The list above already names each locked attribute.
    if (p.speaker_preservation.identity) cover("no_identity_change");
    if (p.speaker_preservation.voice) cover("no_voice_change");
    if (p.speaker_preservation.clothing) cover("no_wardrobe_change");
    if (p.speaker_preservation.lip_sync) cover("no_lip_sync_change");
    if (p.speaker_preservation.body_proportions) cover("no_body_proportion_change");
    if (p.speaker_preservation.original_language) cover("no_translation");
  }

  // ---------- 2b. Image fidelity ----------
  // Placed directly after preservation: stacking depth-of-field, bokeh, glow
  // and relighting reliably softens the subject unless sharpness is demanded.
  const fid = includeFidelity ? p.image_fidelity : undefined;
  if (fid) {
    const fidLines: string[] = [];
    if (fid.preserve_subject_sharpness)
      fidLines.push(
        `Keep the speaker tack sharp and in full focus for the entire edit.`
      );
    if (fid.depth_effects_background_only)
      fidLines.push(
        `Depth of field, bokeh, glow, particles, light streaks, haze, and grain apply to the BACKGROUND ONLY. None of them may touch the speaker's face, hair, or body.`
      );
    if (!fid.allow_face_smoothing)
      fidLines.push(
        `Apply no beauty filter, skin smoothing, denoising, or retouching. Leave the subject exactly as the camera captured them.`
      );
    if (fid.preserve_source_resolution)
      fidLines.push(
        `Match the sharpness and detail of the source footage. The result must never look softer, hazier, or lower-resolution than the original.`
      );
    if (fidLines.length) {
      blocks.push(
        `Image fidelity — the speaker must stay sharp:\n${fidLines.map((l) => `• ${l}`).join("\n")}`
      );
      cover("no_subject_blur", "no_facial_detail_loss", "no_resolution_loss");
    }
  }

  // ---------- 3. Background replacement ----------
  if (p.visual_direction.background_replacement) {
    const target =
      p.visual_direction.background_description ??
      p.visual_direction.environment ??
      "a premium studio environment";
    const elements = p.visual_direction.background_elements ?? [];
    blocks.push(
      elements.length
        ? `Replace the original background with ${target}, featuring ${joinNatural(elements)}.`
        : `Replace the original background with ${target}.`
    );
  } else if (p.visual_direction.environment) {
    blocks.push(`Environment direction: ${p.visual_direction.environment}.`);
  }

  // ---------- 4. Relighting ----------
  if (p.visual_direction.cinematic_relighting) {
    const skin = p.visual_direction.preserve_skin_tones
      ? " while maintaining realistic skin tones"
      : "";
    blocks.push(
      p.visual_direction.background_replacement
        ? `Naturally relight the speaker to perfectly match the new environment${skin} and avoiding green-screen artifacts.`
        : `Apply subtle cinematic relighting${skin} without distorting the subject.`
    );
  }

  // ---------- 5. On-screen text integrity ----------
  const c = p.captions;
  const hasTranscript = p.transcript.source !== "none";

  if (c?.enabled) {
    const position =
      CAPTION_POSITION_PHRASES[c.position ?? "beside_speaker"] ??
      "in a readable position";

    blocks.push(
      `Display large animated text ${position} using the EXACT words spoken in the original audio.`
    );

    if (c.word_for_word) {
      blocks.push(
        `The on-screen text must be a perfect word-for-word transcription of the speaker's dialogue.`
      );
    }

    // Prohibitions, each gated on the corresponding transcript flag.
    const t = p.transcript;
    const noList: string[] = [];
    if (t.preserve_exact_words) {
      noList.push("Do NOT summarize.", "Do NOT paraphrase.");
    }
    if (!t.allow_word_deletion) noList.push("Do NOT shorten.");
    if (!t.allow_rewrite) noList.push("Do NOT rewrite.");
    if (!t.allow_translation) noList.push("Do NOT translate.");
    if (!t.allow_autocorrect) noList.push("Do NOT correct grammar.");
    if (p.constraints.no_keyword_substitution)
      noList.push("Do NOT generate keywords.");
    if (noList.length) {
      blocks.push(noList.join("\n"));
      cover(
        "no_dialogue_rewrite",
        "no_missing_dialogue",
        "no_translation",
        "no_keyword_substitution"
      );
      blocks.push(
        `Every displayed word must exactly match the original spoken audio.`
      );
    }

    // The transcript text itself is emitted as the final block of the prompt
    // (see section 13) — practitioners report the spoken lines landing more
    // reliably when they close the prompt rather than sit in its middle.
    if (hasTranscript && t.text.trim()) {
      blocks.push(
        `The exact words to display are supplied at the very end of this prompt, under LOCKED TRANSCRIPT. Use that text and nothing else as the source for every on-screen word.`
      );
    }

    // Caption behavior
    const behavior: string[] = [];
    behavior.push("Display each sentence exactly when it is spoken.");
    if (c.word_synchronized)
      behavior.push(
        "Synchronize every word perfectly with the speaker's lip movements."
      );
    if (c.replace_on_progress) {
      behavior.push("Replace old text with new text as the speaker continues.");
      behavior.push(
        "Remove each text segment immediately after its spoken phrase ends."
      );
      behavior.push(
        "Do not leave previous text on screen once the next phrase begins."
      );
      behavior.push("Do not display duplicated words or repeated segments.");
    }
    if (!c.allow_future_dialogue) {
      behavior.push("Never show future dialogue before it is spoken.");
      behavior.push("Show only the words currently being spoken.");
    }
    if (c.segment_long_sentences)
      behavior.push(
        "Break long sentences naturally into multiple animated segments for readability."
      );
    if (c.prevent_face_overlap)
      behavior.push("Never cover the speaker's face.");
    behavior.push(`Position the text naturally ${position}.`);
    if (c.motion_tracked)
      behavior.push(
        "Motion-track the text so it integrates into the environment."
      );
    if (c.depth_integration)
      behavior.push(
        "Give the text subtle depth, perspective, and parallax so it sits in the scene. Any softening belongs to the text layer alone — never to the speaker."
      );
    if (c.kinetic_typography) {
      const anims = phrasesFor(c.animations, CAPTION_ANIMATION_PHRASES);
      behavior.push(
        anims.length
          ? `Animate using premium kinetic typography with smooth ${anims.join(", ")}, and elegant transitions.`
          : "Animate using premium kinetic typography with elegant transitions."
      );
    }
    if (c.typography)
      behavior.push(`Use ${c.typography} with excellent readability.`);
    if (c.highlight_colors?.length)
      behavior.push(
        `Highlight important words using elegant ${joinNatural(c.highlight_colors)} accents while keeping the exact wording unchanged.`
      );

    blocks.push(`Caption behavior:\n${bullets(behavior)}`);
    if (!c.allow_future_dialogue) cover("no_future_dialogue");
    if (c.prevent_face_overlap) cover("no_caption_face_overlap");
    if (c.typography) cover("no_unreadable_text");
  } else if (hasTranscript && p.transcript.text.trim()) {
    // No captions module, but a locked transcript still governs the dialogue.
    blocks.push(
      `The dialogue is LOCKED and must be used word-for-word, with no rewriting, translation, insertion, deletion, or repetition:\n"${p.transcript.text}"`
    );
  } else if (p.transcription_requirement?.required) {
    // Captions were asked for without a known transcript. Spell out a
    // verification protocol so the model transcribes and self-checks
    // instead of inventing dialogue.
    const tr = p.transcription_requirement;

    // Steps are collected unnumbered, then numbered on render so that
    // toggling any policy off cannot leave a gap in the sequence.
    const steps: string[] = [];
    steps.push(
      editsFootage
        ? `LISTEN to the complete audio of the attached source video from start to finish before writing any text.`
        : `LISTEN to the complete audio of the attached source footage from start to finish before writing any text.`
    );
    steps.push(
      `TRANSCRIBE what is actually spoken, word for word, exactly as heard${
        tr.preserve_original_language
          ? `, in the speaker's original language. Do NOT translate it into any other language, not even partially`
          : ""
      }.`
    );

    const keep: string[] = [];
    if (tr.preserve_filler_words)
      keep.push("Filler words and hesitations, exactly as spoken.");
    if (tr.preserve_repeated_words)
      keep.push(
        "Genuinely repeated words — repeated exactly as many times as they are actually said, never more and never fewer."
      );
    if (tr.preserve_slang_and_dialect)
      keep.push("Slang, dialect, and informal pronunciation, as spoken.");
    if (!tr.allow_grammar_correction)
      keep.push(
        "The speaker's original grammar, even where it is informal or incorrect."
      );
    if (keep.length)
      steps.push(
        `PRESERVE the following exactly as spoken:\n${keep.map((k) => `   • ${k}`).join("\n")}`
      );

    if (tr.verify_against_audio)
      steps.push(
        `VERIFY before rendering: replay the audio and compare it against your transcription word by word. Every word on screen must be traceable to a word actually audible in the source. If any word does not match, correct the text to match the audio — never bend the meaning to fit text you already wrote.`
      );
    steps.push(
      `SYNCHRONIZE each word to the exact moment it is spoken, within ${tr.sync_tolerance_seconds} seconds. Text must never run ahead of or behind the voice.`
    );

    const numberedSteps = steps.map((s, i) => `${i + 1}. ${s}`);

    const prohibitions = [
      `Do NOT invent dialogue.`,
      `Do NOT guess what the speaker says.`,
      `Do NOT write any word that is not audibly spoken in the source.`,
      `Do NOT omit any word that IS spoken.`,
      `Do NOT duplicate a word that is spoken only once.`,
      `Do NOT reorder the spoken words.`,
      `Do NOT translate the spoken language.`,
      `Do NOT summarize or paraphrase.`,
      `Do NOT replace spoken words with keywords, labels, or your own summary.`,
    ];
    if (!tr.allow_grammar_correction)
      prohibitions.push(`Do NOT correct the speaker's grammar or wording.`);

    blocks.push(
      [
        `The on-screen text must match the spoken audio exactly.`,
        ``,
        `On-screen text is requested, but the dialogue has NOT been transcribed yet, so no transcript is supplied with this prompt. You must derive it from the source audio yourself using this protocol:`,
        ``,
        ...numberedSteps,
        ``,
        ...prohibitions,
        tr.omit_unclear_audio
          ? `\nIf any portion of the audio is unclear or inaudible, leave that portion without on-screen text. Showing nothing is correct; guessing is a failure.`
          : null,
        `\nThe finished captions must read as a faithful, verbatim record of what the speaker actually said. Any mismatch between the spoken audio and the on-screen text is a failure of this task.`,
      ]
        .filter((l): l is string => l !== null)
        .join("\n")
    );
    // The protocol's own prohibition list already states these.
    cover(
      "no_dialogue_rewrite",
      "no_missing_dialogue",
      "no_added_dialogue",
      "no_dialogue_repetition",
      "no_translation",
      "no_keyword_substitution"
    );
  }

  // ---------- 6. Premium editing ----------
  const editingItems: string[] = [];
  for (const key of [
    "dynamic_zoom",
    "punch_ins",
    "auto_reframe",
    "speed_ramps",
    "b_roll",
    "motion_graphics",
    "transitions",
  ] as const) {
    if (p.editing[key] && EDITING_PHRASES[key])
      editingItems.push(EDITING_PHRASES[key]);
  }
  if (p.camera_motion?.enabled)
    editingItems.push(...phrasesFor(p.camera_motion.moves, CAMERA_MOVE_PHRASES));
  if (p.motion_graphics?.enabled)
    editingItems.push(
      ...phrasesFor(p.motion_graphics.elements, MOTION_ELEMENT_PHRASES)
    );
  if (p.visual_effects?.enabled)
    editingItems.push(
      ...phrasesFor(p.visual_effects.effects, VISUAL_EFFECT_PHRASES)
    );
  if (p.visual_direction.color_grading)
    editingItems.push(
      `${p.visual_direction.color_grading[0].toUpperCase()}${p.visual_direction.color_grading.slice(1)}.`
    );

  if (editingItems.length)
    blocks.push(
      `Enhance the video with premium editing:\n${bullets([...new Set(editingItems)])}`
    );

  // ---------- 7. Sound design ----------
  if (p.sound_design?.enabled) {
    const sfx = phrasesFor(p.sound_design.palette, SFX_PHRASES);
    if (p.sound_design.never_overpower_speech)
      sfx.push(
        "Professionally mix all sound effects without overpowering the original voice."
      );
    if (p.audio.music_ducking)
      sfx.push(
        "Automatically duck the background music while the speaker is talking."
      );
    if (sfx.length)
      blocks.push(`Create immersive cinematic sound design:\n${bullets(sfx)}`);
  }

  // ---------- 8. Background music ----------
  if (p.background_music?.enabled) {
    blocks.push(
      p.background_music.description
        ? `Background music:\nUse ${p.background_music.description}.`
        : `Background music:\nUse ${joinNatural(p.background_music.style)} music, kept subtle beneath the narration.`
    );
  }

  // ---------- 9. Pacing ----------
  const interval = p.editing.target_visual_change_interval_seconds;
  const pacingWord = PACING_PHRASES[p.editing.pacing] ?? p.editing.pacing;
  blocks.push(
    interval
      ? `Maintain ${pacingWord} pacing with meaningful visual changes every ${interval[0]}–${interval[1]} seconds to maximize audience retention while keeping the edit clean, elegant, and professional.`
      : `Maintain ${pacingWord} pacing while keeping the edit clean, elegant, and professional.`
  );

  // ---------- 10. Timeline directions ----------
  if (includeTimeline && p.timeline.length) {
    const lines = p.timeline.map((e) => {
      const what =
        e.type === "sound_effect"
          ? `sound effect "${e.sound_effect}"`
          : `${e.type.replace(/_/g, " ")}${e.action ? ` (${e.action.replace(/_/g, " ")})` : ""}`;
      return `${e.start.toFixed(1)}s–${e.end.toFixed(1)}s: ${what}${e.reason ? ` — ${e.reason}` : ""}`;
    });
    blocks.push(`Timeline directions:\n${bullets(lines)}`);
  }

  // ---------- 11. Negative constraints ----------
  const negatives = (Object.keys(p.constraints) as ConstraintKey[])
    .filter((k) => p.constraints[k] && !covered.has(k))
    .map((k) => CONSTRAINT_PHRASES[k])
    .filter(Boolean);
  if (negatives.length)
    blocks.push(`Negative Constraints:\n${bullets([...new Set(negatives)])}`);

  // ---------- 12. Final output statement ----------
  const platforms = p.output.platform_targets
    .map((t) => PLATFORM_PHRASES[t])
    .filter(Boolean);
  const finalFeatures: string[] = [];
  if (p.visual_direction.color_grading || p.editing.transitions)
    finalFeatures.push("cinematic visuals");
  if (p.motion_graphics?.enabled) finalFeatures.push("luxury motion graphics");
  if (p.sound_design?.enabled) finalFeatures.push("immersive sound design");
  if (c?.kinetic_typography) finalFeatures.push("elegant kinetic typography");
  if (c?.word_synchronized)
    finalFeatures.push("perfect word-for-word synchronized captions");
  finalFeatures.push(
    `professional ${p.visual_direction.style} editing with maximum viewer retention`
  );

  blocks.push(
    `Final output should look like a ${quality} ${joinNatural(platforms, "or")} edited by a world-class creative agency, featuring ${joinNatural(finalFeatures)}.`
  );
  if (p.output.aspect_ratio) {
    const vertical = p.output.aspect_ratio === "9:16" ? " vertical" : "";
    blocks.push(`Final aspect ratio: ${p.output.aspect_ratio}${vertical}.`);
  }

  // ---------- 13. Locked transcript, last ----------
  // Closing the prompt with the spoken lines keeps them adjacent to where the
  // model starts writing, instead of buried behind the styling instructions.
  if (p.transcript.source !== "none" && p.transcript.text.trim()) {
    // Phrased as the dialogue to be delivered, rather than as an instruction
    // to analyse the speaker's recorded voice — the requirement is identical
    // and this wording is what practitioners report getting accepted.
    blocks.push(
      [
        `The speaker says the following dialogue exactly once:`,
        ``,
        `"${p.transcript.text}"`,
        ``,
        `The spoken dialogue and the displayed text must use exactly these words, in exactly this spelling and word order.`,
        `There must be no typographical errors.`,
        `There must be no missing words.`,
        `There must be no additional words.`,
        `There must be no duplicated words.`,
        `There must be no repeated sentences.`,
        `The speaker must not repeat any word or phrase unless it is written more than once above.`,
        `The displayed text must appear only once, following the natural timing of the speech.`,
      ].join("\n")
    );
  }

  return blocks.join("\n\n");
}
