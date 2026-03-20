"use client";

import type { ExtendedCoachInsights } from "@/lib/types";
import { detectAgentMonologues, formatMonologueWarning } from "@/lib/monologue";
import type { TranscriptSegment } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

function paceLabel(wpm: number): { text: string; ok: boolean } {
  if (wpm < 120) return { text: `🐢 Slow (${wpm} WPM)`, ok: false };
  if (wpm <= 160) return { text: `✅ Good (${wpm} WPM)`, ok: true };
  return { text: `🚀 Fast (${wpm} WPM)`, ok: false };
}

export function FillerHabitBadges({
  insights,
  transcript,
  durationSeconds,
  segments,
}: {
  insights: ExtendedCoachInsights | null;
  transcript: string | null;
  durationSeconds: number | null;
  segments: TranscriptSegment[] | null;
}) {
  const filler = insights?.filler_word_count ?? {};
  const top = Object.entries(filler)
    .filter(([, n]) => (n as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);

  let wpm: number | null = null;
  if (transcript && durationSeconds && durationSeconds > 0) {
    const words = transcript.trim().split(/\s+/).filter(Boolean).length;
    wpm = Math.round(words / (durationSeconds / 60));
  }
  const pace = wpm != null ? paceLabel(wpm) : null;
  const mono = formatMonologueWarning(detectAgentMonologues(segments));

  if (!top.length && !pace && !mono) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {top.map(([k, v]) => (
        <Badge key={k} variant="secondary" className="font-normal">
          {k.replace(/_/g, " ")} ×{v as number}
        </Badge>
      ))}
      {pace && (
        <Badge variant={pace.ok ? "default" : "secondary"} className="font-normal">
          {pace.text}
        </Badge>
      )}
      {mono && (
        <span className="text-amber-700 dark:text-amber-300" title={mono}>
          {mono}
        </span>
      )}
    </div>
  );
}
