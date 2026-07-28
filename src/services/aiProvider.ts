/**
 * Provider-agnostic AI service layer.
 *
 * The frontend only ever talks to the app's own API (`/api/...`); gateway
 * credentials (e.g. 9Router) live exclusively server-side. When the server
 * is not configured, services degrade gracefully and the UI falls back to
 * the deterministic local pipeline.
 */

export interface TranscriptionResult {
  text: string;
  language?: string;
  speakers: { id: string; label: string }[];
  words?: { word: string; start: number; end: number; speaker_id: string }[];
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

async function post<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const TranscriptionService = {
  /** Returns null when no backend/AI gateway is configured. */
  transcribe: (uploadId: string) =>
    post<TranscriptionResult>("/api/transcribe", { uploadId }),
};

export const VideoAnalysisService = {
  analyze: (uploadId: string) =>
    post<VideoAnalysisResult>("/api/analyze-video", { uploadId }),
};

export const ServerHealth = {
  check: async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/health");
      return res.ok;
    } catch {
      return false;
    }
  },
};
