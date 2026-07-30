import {
  UniversalVideoProject,
  UniversalVideoProjectSchema,
} from "../../schemas/universal";

export type Severity = "PASS" | "INFO" | "WARNING" | "ERROR";

export interface ValidationResult {
  severity: Severity;
  title: string;
  detail: string;
}

/**
 * Normalization is used ONLY for comparison — it never modifies stored text.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'()\[\]{}—–-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function compareTranscriptTokens(
  original: string,
  generated: string
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const a = tokenize(original);
  const b = tokenize(generated);

  if (a.join(" ") === b.join(" ")) {
    results.push({
      severity: "PASS",
      title: "Transcript Integrity",
      detail:
        "No missing, duplicated, modified, or reordered dialogue detected.",
    });
    return results;
  }

  // Multiset diff for missing/extra tokens
  const count = (arr: string[]) => {
    const m = new Map<string, number>();
    for (const w of arr) m.set(w, (m.get(w) ?? 0) + 1);
    return m;
  };
  const ca = count(a);
  const cb = count(b);
  const missing: string[] = [];
  const extra: string[] = [];
  for (const [w, n] of ca) {
    const d = n - (cb.get(w) ?? 0);
    if (d > 0) missing.push(`${w}${d > 1 ? ` ×${d}` : ""}`);
  }
  for (const [w, n] of cb) {
    const d = n - (ca.get(w) ?? 0);
    if (d > 0) extra.push(`${w}${d > 1 ? ` ×${d}` : ""}`);
  }

  if (missing.length)
    results.push({
      severity: "ERROR",
      title: "Transcript Mismatch — Missing Words",
      detail: `Locked transcript words missing from generated captions: ${missing.join(", ")}`,
    });
  if (extra.length) {
    // An extra occurrence of a word that already exists in the locked
    // transcript is a duplication; a word absent from it is an insertion.
    const duplicated = extra.filter((e) => ca.has(e.split(" ×")[0]));
    const inserted = extra.filter((e) => !ca.has(e.split(" ×")[0]));
    if (duplicated.length)
      results.push({
        severity: "ERROR",
        title: "Transcript Mismatch — Duplicated Words",
        detail: `Words repeated beyond the locked transcript: ${duplicated.join(", ")}`,
      });
    if (inserted.length)
      results.push({
        severity: "ERROR",
        title: "Transcript Mismatch — Inserted Words",
        detail: `Words in generated captions not present in the locked transcript: ${inserted.join(", ")}`,
      });
  }
  if (!missing.length && !extra.length)
    results.push({
      severity: "ERROR",
      title: "Transcript Mismatch — Reordered Words",
      detail:
        "Generated captions contain the same words as the locked transcript but in a different order.",
    });
  return results;
}

export function validateProject(raw: unknown): ValidationResult[] {
  const results: ValidationResult[] = [];

  // 1. Structure
  const parsed = UniversalVideoProjectSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 10)) {
      results.push({
        severity: "ERROR",
        title: "Schema Violation",
        detail: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      });
    }
    return results;
  }
  const p: UniversalVideoProject = parsed.data;
  results.push({
    severity: "PASS",
    title: "Schema Structure",
    detail: `Valid Universal JSON, schema version ${p.schema_version}.`,
  });

  // 2. Transcript integrity (locked transcript vs caption/dialogue text)
  if (p.transcript.source !== "none" && p.transcript.preserve_exact_words) {
    const generatedCaptionText = p.dialogue_timeline
      .map((d) => d.text)
      .join(" ");
    if (p.dialogue_timeline.length > 0) {
      results.push(
        ...compareTranscriptTokens(p.transcript.text, generatedCaptionText)
      );
    } else if (p.transcript.text.trim()) {
      results.push({
        severity: "INFO",
        title: "Transcript Not Segmented",
        detail:
          "A locked transcript exists but no dialogue timeline entries were generated.",
      });
    }
  } else if (p.transcript.source === "none") {
    results.push({
      severity: "INFO",
      title: "No Transcript",
      detail: "Project has no transcript; caption checks skipped.",
    });
  }

  // 2b. Captions must never claim a verbatim source that does not exist.
  if (p.captions?.enabled && !p.transcript.text.trim()) {
    results.push({
      severity: "ERROR",
      title: "Captions Without Transcript",
      detail:
        "Captions are enabled and sourced from the locked transcript, but the transcript is empty. Any generated caption would be invented dialogue. Provide a manual transcript or disable captions.",
    });
  }
  const typographyEvents = p.timeline.filter(
    (e) => e.text_source === "locked_transcript"
  );
  if (typographyEvents.length && !p.transcript.text.trim()) {
    results.push({
      severity: "ERROR",
      title: "Typography Without Transcript",
      detail: `${typographyEvents.length} timeline event(s) quote the locked transcript, but it is empty: ${typographyEvents.map((e) => e.id).join(", ")}`,
    });
  }
  if (p.transcription_requirement?.required) {
    results.push({
      severity: "WARNING",
      title: "Transcription Delegated To Video Model",
      detail:
        "On-screen text was requested without a locked transcript, so the prompt instructs the video model to transcribe the audio itself. Word-for-word accuracy cannot be verified here — supply a manual transcript for a guaranteed match.",
    });
  }

  // 2c. Characters
  const characters = p.characters ?? [];
  if (characters.length) {
    const speakerIdSet = new Set(p.speakers.map((s) => s.id));
    const danglingLinks = characters.filter(
      (c) => c.speaker_id && !speakerIdSet.has(c.speaker_id)
    );
    if (danglingLinks.length)
      results.push({
        severity: "ERROR",
        title: "Character Links To Missing Speaker",
        detail: `${danglingLinks
          .map((c) => `${c.name} → ${c.speaker_id}`)
          .join(", ")} — the speaker does not exist, so the prompt would claim someone is on camera who is not defined.`,
      });

    const unlocked = characters.filter((c) => !c.lock_across_shots);
    if (unlocked.length)
      results.push({
        severity: "WARNING",
        title: "Character Not Locked Across Shots",
        detail: `${unlocked
          .map((c) => c.name)
          .join(", ")} may be redrawn between shots. Generated video drifts faces and wardrobe by default — lock the character unless you want that variation.`,
      });

    // Preserving a filmed person and inventing one are different jobs. Asking
    // for both without linking them tells the model there are two subjects.
    const unlinked = characters.filter((c) => !c.speaker_id);
    if (
      unlinked.length &&
      p.source.media_type === "video" &&
      p.speaker_preservation.identity
    )
      results.push({
        severity: "WARNING",
        title: "Character Alongside Preserved Speaker",
        detail: `${unlinked
          .map((c) => c.name)
          .join(", ")} ${unlinked.length === 1 ? "is" : "are"} not linked to a speaker, but identity preservation is on for filmed footage. The model may add a second person instead of describing the one on camera — set the character's speaker to link them.`,
      });
    else
      results.push({
        severity: "PASS",
        title: "Characters",
        detail: `${characters.length} character${characters.length === 1 ? "" : "s"} defined, each with an appearance the model can render.`,
      });
  }

  // 3. Speaker references
  const speakerIds = new Set(p.speakers.map((s) => s.id));
  const badRefs = p.dialogue_timeline.filter(
    (d) => !speakerIds.has(d.speaker_id)
  );
  if (badRefs.length)
    results.push({
      severity: "ERROR",
      title: "Invalid Speaker Reference",
      detail: `${badRefs.length} dialogue entr${badRefs.length === 1 ? "y" : "ies"} reference speaker IDs that do not exist: ${[...new Set(badRefs.map((d) => d.speaker_id))].join(", ")}`,
    });
  else if (p.dialogue_timeline.length)
    results.push({
      severity: "PASS",
      title: "Speaker References",
      detail: "All dialogue entries reference valid speakers.",
    });

  // 4. Timeline sanity
  const duration = p.source.duration_seconds ?? 0;
  const negative = p.timeline.filter((e) => e.end < e.start);
  if (negative.length)
    results.push({
      severity: "ERROR",
      title: "Negative Event Duration",
      detail: `Events with end before start: ${negative.map((e) => e.id).join(", ")}`,
    });
  if (duration > 0) {
    const outside = p.timeline.filter(
      (e) => e.start > duration || e.end > duration + 0.05
    );
    if (outside.length)
      results.push({
        severity: "ERROR",
        title: "Event Outside Video Duration",
        detail: `Events exceed the ${duration}s source: ${outside.map((e) => e.id).join(", ")}`,
      });
    else if (p.timeline.length)
      results.push({
        severity: "PASS",
        title: "Timeline Bounds",
        detail: "All timeline events fall within the source duration.",
      });
  }

  // Effect density: visual events in any sliding 8s window
  const visual = p.timeline.filter((e) => e.type !== "sound_effect");
  let maxDensity = 0;
  for (const e of visual) {
    const n = visual.filter(
      (o) => o.start >= e.start && o.start < e.start + 8
    ).length;
    maxDensity = Math.max(maxDensity, n);
  }
  if (maxDensity > 10)
    results.push({
      severity: "WARNING",
      title: "High Effect Density",
      detail: `${maxDensity} visual events occur within an 8-second window. Consider reducing to avoid a chaotic result.`,
    });

  // 5. Preservation conflicts
  if (p.speaker_preservation.clothing && /outfit|wardrobe|clothing/i.test(
    p.visual_direction.background_description ?? ""
  ))
    results.push({
      severity: "ERROR",
      title: "Preservation Conflict — Wardrobe",
      detail:
        "speaker_preservation.clothing is enabled but the visual direction describes changing the speaker's outfit.",
    });
  if (
    p.speaker_preservation.voice &&
    !p.audio.preserve_original_voice
  )
    results.push({
      severity: "ERROR",
      title: "Preservation Conflict — Voice",
      detail:
        "speaker_preservation.voice is enabled but audio.preserve_original_voice is false.",
    });
  if (
    p.constraints.no_wardrobe_change !== p.speaker_preservation.clothing
  )
    results.push({
      severity: "WARNING",
      title: "Constraint Drift — Wardrobe",
      detail:
        "constraints.no_wardrobe_change does not match speaker_preservation.clothing.",
    });

  // 6. Output checks
  if (
    p.output.platform_targets.some((t) =>
      ["instagram_reels", "tiktok", "youtube_shorts"].includes(t)
    ) &&
    p.output.aspect_ratio &&
    p.output.aspect_ratio !== "9:16"
  )
    results.push({
      severity: "WARNING",
      title: "Aspect Ratio vs Platform",
      detail: `Vertical platforms are targeted but output aspect ratio is ${p.output.aspect_ratio}. 9:16 is recommended.`,
    });
  if (
    duration > 0 &&
    p.output.platform_targets.includes("tiktok") &&
    duration > 600
  )
    results.push({
      severity: "WARNING",
      title: "Duration vs Platform",
      detail: "Source exceeds 10 minutes; TikTok short-form targets much shorter content.",
    });

  const hasError = results.some((r) => r.severity === "ERROR");
  const hasWarning = results.some((r) => r.severity === "WARNING");
  results.unshift({
    severity: hasError ? "ERROR" : hasWarning ? "WARNING" : "PASS",
    title: "Overall",
    detail: hasError
      ? "Validation failed — fix errors before export."
      : hasWarning
        ? "Valid with warnings — review before export."
        : "All checks passed.",
  });
  return results;
}
