/**
 * Deterministic repairs for validation findings.
 *
 * A fix exists only where the correct outcome is unambiguous. Anything that
 * would require inventing dialogue — a transcript mismatch, an empty locked
 * transcript — has no fix here by design: that is exactly what the locked
 * transcript system is meant to prevent.
 *
 * Fixes are pure; they take a project and return a new one.
 */
import { UniversalVideoProject } from "../../schemas/universal";
import { ValidationResult } from "./validate";

export interface AutoFix {
  /** Imperative button label. */
  label: string;
  /** What it changes — stated so a lossy repair is never a surprise. */
  effect: string;
  /**
   * True when the fix drops requested content rather than just reconciling
   * two fields. These are excluded from "Fix all safe issues".
   */
  lossy: boolean;
  apply: (p: UniversalVideoProject) => UniversalVideoProject;
}

const DENSITY_LIMIT = 10;
const DENSITY_WINDOW = 8;

/** Largest number of visual events starting within any 8s window. */
function maxDensity(timeline: UniversalVideoProject["timeline"]): number {
  const visual = timeline.filter((e) => e.type !== "sound_effect");
  let max = 0;
  for (const e of visual) {
    const n = visual.filter(
      (o) => o.start >= e.start && o.start < e.start + DENSITY_WINDOW
    ).length;
    max = Math.max(max, n);
  }
  return max;
}

/**
 * Thins visual events until no window breaches the limit, dropping the least
 * emphatic first (lowest intensity, then latest) so the strongest beats of the
 * edit survive. Sound effects are never touched — they do not count as visual
 * clutter and carry the pacing.
 */
function thinTimeline(
  timeline: UniversalVideoProject["timeline"]
): UniversalVideoProject["timeline"] {
  const kept = [...timeline];
  // Bounded by the number of visual events, so this always terminates.
  for (let guard = kept.length; guard >= 0; guard--) {
    if (maxDensity(kept) <= DENSITY_LIMIT) break;
    const visual = kept.filter((e) => e.type !== "sound_effect");
    if (!visual.length) break;

    // Score each visual event by how many over-dense windows it sits in.
    let worst = visual[0];
    let worstScore = -1;
    for (const e of visual) {
      const window = visual.filter(
        (o) => o.start >= e.start && o.start < e.start + DENSITY_WINDOW
      );
      if (window.length <= DENSITY_LIMIT) continue;
      for (const candidate of window) {
        const score =
          window.length * 1000 -
          (candidate.intensity ?? 0.5) * 100 +
          candidate.start;
        if (score > worstScore) {
          worstScore = score;
          worst = candidate;
        }
      }
    }
    const idx = kept.indexOf(worst);
    if (idx === -1) break;
    kept.splice(idx, 1);
  }
  return kept;
}

/** Strips everything that quotes a transcript the project does not have. */
function removeTranscriptDependentText(
  p: UniversalVideoProject
): UniversalVideoProject {
  const next: UniversalVideoProject = {
    ...p,
    timeline: p.timeline.filter((e) => e.text_source !== "locked_transcript"),
  };
  if (next.captions) next.captions = { ...next.captions, enabled: false };
  delete next.transcription_requirement;
  return next;
}

const FIXES: Record<
  string,
  (p: UniversalVideoProject, f: ValidationResult) => AutoFix | null
> = {
  "Constraint Drift — Wardrobe": (p) => ({
    label: "Sync constraint",
    effect: `Set constraints.no_wardrobe_change to ${p.speaker_preservation.clothing}, matching speaker_preservation.clothing.`,
    lossy: false,
    apply: (proj) => ({
      ...proj,
      constraints: {
        ...proj.constraints,
        no_wardrobe_change: proj.speaker_preservation.clothing,
      },
    }),
  }),

  "Preservation Conflict — Voice": () => ({
    label: "Preserve voice",
    effect:
      "Set audio.preserve_original_voice to true, matching speaker_preservation.voice.",
    lossy: false,
    apply: (proj) => ({
      ...proj,
      audio: { ...proj.audio, preserve_original_voice: true },
    }),
  }),

  "Aspect Ratio vs Platform": () => ({
    label: "Use 9:16",
    effect: "Set output.aspect_ratio to 9:16 for the vertical platforms targeted.",
    lossy: false,
    apply: (proj) => ({
      ...proj,
      output: { ...proj.output, aspect_ratio: "9:16" },
    }),
  }),

  "Negative Event Duration": () => ({
    label: "Swap times",
    effect: "Swap start and end on events whose end precedes their start.",
    lossy: false,
    apply: (proj) => ({
      ...proj,
      timeline: proj.timeline.map((e) =>
        e.end < e.start ? { ...e, start: e.end, end: e.start } : e
      ),
    }),
  }),

  "Invalid Speaker Reference": (p) => {
    const fallback = p.speakers[0]?.id;
    if (!fallback) return null;
    const valid = new Set(p.speakers.map((s) => s.id));
    return {
      label: "Reassign speaker",
      effect: `Point dangling dialogue references at ${fallback}.`,
      lossy: false,
      apply: (proj) => ({
        ...proj,
        dialogue_timeline: proj.dialogue_timeline.map((d) =>
          valid.has(d.speaker_id) ? d : { ...d, speaker_id: fallback }
        ),
      }),
    };
  },

  "Event Outside Video Duration": (p) => {
    const duration = p.source.duration_seconds ?? 0;
    if (duration <= 0) return null;
    return {
      label: "Clamp to duration",
      effect: `Trim events to the ${duration}s source, dropping any that start past the end.`,
      lossy: true,
      apply: (proj) => ({
        ...proj,
        timeline: proj.timeline
          .filter((e) => e.start <= duration)
          .map((e) => (e.end > duration ? { ...e, end: duration } : e)),
      }),
    };
  },

  "High Effect Density": (p) => ({
    label: "Thin effects",
    effect: `Drop the least emphatic visual events until no 8-second window holds more than ${DENSITY_LIMIT}.`,
    lossy: true,
    apply: (proj) => ({ ...proj, timeline: thinTimeline(proj.timeline) }),
  }),

  "Transcription Delegated To Video Model": () => ({
    label: "Remove on-screen text",
    effect:
      "Drop the caption and typography events that need a transcript, so the video model is not asked to invent dialogue. Supplying a Manual Locked transcript instead keeps the text and makes it verifiable.",
    lossy: true,
    apply: removeTranscriptDependentText,
  }),

  "Captions Without Transcript": () => ({
    label: "Disable captions",
    effect:
      "Turn captions off. They are sourced from the locked transcript, which is empty.",
    lossy: true,
    apply: (proj) =>
      proj.captions
        ? { ...proj, captions: { ...proj.captions, enabled: false } }
        : proj,
  }),

  "Typography Without Transcript": () => ({
    label: "Remove typography",
    effect: "Drop the timeline events that quote the empty locked transcript.",
    lossy: true,
    apply: (proj) => ({
      ...proj,
      timeline: proj.timeline.filter(
        (e) => e.text_source !== "locked_transcript"
      ),
    }),
  }),
};

/** The fix for a finding, or null when none can be applied safely. */
export function fixFor(
  finding: ValidationResult,
  project: UniversalVideoProject
): AutoFix | null {
  if (finding.severity === "PASS" || finding.title === "Overall") return null;
  const build = FIXES[finding.title];
  return build ? build(project, finding) : null;
}

/** Non-lossy fixes for the current findings, in listed order. */
export function safeFixes(
  findings: ValidationResult[],
  project: UniversalVideoProject
): AutoFix[] {
  const out: AutoFix[] = [];
  const seen = new Set<string>();
  for (const f of findings) {
    if (seen.has(f.title)) continue;
    const fix = fixFor(f, project);
    if (fix && !fix.lossy) {
      seen.add(f.title);
      out.push(fix);
    }
  }
  return out;
}
