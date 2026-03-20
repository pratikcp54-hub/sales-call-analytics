import type { TranscriptSegment } from "@/lib/types";

/**
 * Speaker A = agent, all other speakers = customer (aggregated).
 * Percentages are by utterance duration (ms).
 */
export function computeTalkPercents(
  utterances: { start: number; end: number; speaker: string }[]
): { agent: number; customer: number } {
  if (!utterances.length) {
    return { agent: 50, customer: 50 };
  }

  let agentMs = 0;
  let customerMs = 0;
  for (const u of utterances) {
    const dur = Math.max(0, u.end - u.start);
    if (u.speaker === "A") agentMs += dur;
    else customerMs += dur;
  }
  const total = agentMs + customerMs;
  if (total === 0) return { agent: 50, customer: 50 };
  return {
    agent: Math.round((agentMs / total) * 1000) / 10,
    customer: Math.round((customerMs / total) * 1000) / 10,
  };
}

export function utterancesToSegments(
  utterances: { start: number; end: number; speaker: string; text: string }[]
): TranscriptSegment[] {
  return utterances.map((u) => ({
    start: u.start,
    end: u.end,
    speaker: u.speaker,
    text: u.text,
  }));
}
