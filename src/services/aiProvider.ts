/**
 * Provider-agnostic AI service layer.
 *
 * The frontend only ever talks to the app's own API (`/api/...`); gateway
 * credentials (e.g. 9Router) live exclusively server-side. When the server
 * is not configured, services degrade gracefully and the UI falls back to
 * the deterministic local pipeline.
 */

export interface TranscriptSegment {
  start: number;
  end: number;
  speaker_id: string;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  speakers: { id: string; label: string }[];
  words?: { word: string; start: number; end: number; speaker_id: string }[];
  segments?: TranscriptSegment[];
  /** "estimated" means timings come from the model, not forced alignment. */
  timing_precision?: "estimated" | "aligned";
  /** True when the source was longer than the server's audio cap. */
  truncated?: boolean;
  confidence?: number;
}

export interface SemanticInsight {
  start: number;
  end: number;
  observation: string;
  recommendation: string;
}

export interface VideoAnalysisResult {
  scenes: number;
  speech_detected: boolean;
  speaker_count: number;
  orientation: string;
  quality: string;
  framing: string;
  semantic_insights: SemanticInsight[];
  recommended_preset_id?: string;
}

export interface ServerStatus {
  ok: boolean;
  aiConfigured: boolean;
  model?: string;
}

/** Thrown for failures worth showing the user, rather than silently degrading. */
export class AiError extends Error {}

async function post<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new AiError(detail?.error ?? `request failed (${res.status})`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof AiError) throw err;
    return null;
  }
}

export const MediaService = {
  /**
   * Streams the file to the API as a raw body (the server writes it straight
   * to a temp file). Returns the id the analysis endpoints key off.
   */
  upload: async (file: File): Promise<string> => {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": file.name.replace(/[^\w.\- ]+/g, "_"),
      },
      body: file,
    });
    if (res.status === 413) {
      throw new AiError(
        "The video is too large to send for analysis (the proxy caps request " +
          "bodies at ~100 MB). Trim or compress it, or use Manual Locked transcript."
      );
    }
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new AiError(detail?.error ?? `upload failed (${res.status})`);
    }
    const { uploadId } = (await res.json()) as { uploadId: string };
    return uploadId;
  },

  /** Best-effort: the server also sweeps on a TTL. */
  discard: (uploadId: string) => {
    void post("/api/discard", { uploadId }).catch(() => null);
  },
};

export const TranscriptionService = {
  transcribe: (uploadId: string) =>
    post<TranscriptionResult>("/api/transcribe", { uploadId }),
};

export const VideoAnalysisService = {
  analyze: (uploadId: string) =>
    post<VideoAnalysisResult>("/api/analyze-video", { uploadId }),
};

export const ServerHealth = {
  /** Full status, or null when the API is unreachable. */
  status: async (): Promise<ServerStatus | null> => {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) return null;
      return (await res.json()) as ServerStatus;
    } catch {
      return null;
    }
  },

  /** True only when the gateway is actually usable, not merely reachable. */
  check: async (): Promise<boolean> => {
    const s = await ServerHealth.status();
    return Boolean(s?.ok && s.aiConfigured);
  },
};
