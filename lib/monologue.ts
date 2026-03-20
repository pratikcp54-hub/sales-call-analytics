import type { TranscriptSegment } from "@/lib/types";

const AGENT_SPEAKER = "A";
const LONG_MS = 120_000; // 2 minutes

export type MonologueSpan = { startMs: number; endMs: number; durationSec: number };

/**
 * Long stretches where only the agent (speaker A) talks without customer interjection.
 */
export function detectAgentMonologues(segments: TranscriptSegment[] | null): MonologueSpan[] {
  if (!segments?.length) return [];
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const out: MonologueSpan[] = [];
  let runStart = -1;
  let runEnd = -1;

  for (const s of sorted) {
    if (s.speaker === AGENT_SPEAKER) {
      if (runStart < 0) {
        runStart = s.start;
        runEnd = s.end;
      } else if (s.start <= runEnd + 500) {
        runEnd = Math.max(runEnd, s.end);
      } else {
        pushIfLong(runStart, runEnd, out);
        runStart = s.start;
        runEnd = s.end;
      }
    } else {
      if (runStart >= 0) {
        pushIfLong(runStart, runEnd, out);
        runStart = -1;
        runEnd = -1;
      }
    }
  }
  if (runStart >= 0) pushIfLong(runStart, runEnd, out);
  return out;
}

function pushIfLong(start: number, end: number, out: MonologueSpan[]) {
  const dur = Math.max(0, end - start);
  if (dur >= LONG_MS) {
    out.push({
      startMs: start,
      endMs: end,
      durationSec: Math.round(dur / 1000),
    });
  }
}

export function formatMonologueWarning(spans: MonologueSpan[]): string | null {
  if (!spans.length) return null;
  const s = spans[0];
  const fmt = (ms: number) => {
    const t = Math.floor(ms / 1000);
    const m = Math.floor(t / 60);
    const sec = t % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };
  return `⚠️ ${spans.length} long monologue${spans.length > 1 ? "s" : ""} detected (${fmt(s.startMs)} – ${fmt(s.endMs)})`;
}
