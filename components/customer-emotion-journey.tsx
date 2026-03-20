"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { EmotionTimelinePoint, TranscriptSegment } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function snippetForMinute(segments: TranscriptSegment[] | null, minute: number): string {
  if (!segments?.length) return "—";
  const startMs = (minute - 1) * 60_000;
  const endMs = minute * 60_000;
  const parts = segments
    .filter((s) => s.start < endMs && s.end > startMs)
    .map((s) => s.text.trim())
    .filter(Boolean);
  const t = parts.join(" ").slice(0, 220);
  return t || "—";
}

export function CustomerEmotionJourney({
  points,
  segments,
  startSentiment,
  endSentiment,
  objections,
  competitors,
}: {
  points: EmotionTimelinePoint[];
  segments: TranscriptSegment[] | null;
  startSentiment: string;
  endSentiment: string;
  objections: { type?: string }[];
  competitors: { name?: string }[];
}) {
  const data = points.map((p) => ({
    minute: p.minute,
    score: p.score,
    snippet: snippetForMinute(segments, p.minute),
  }));

  const durationMin = points.length ? Math.max(...points.map((p) => p.minute)) : 1;
  const objectionMarks = objections.map((_, i) => Math.ceil(((i + 1) / Math.max(objections.length, 1)) * durationMin));
  const competitorMarks = competitors.map((_, i) =>
    Math.ceil(((i + 1) / Math.max(competitors.length, 1)) * durationMin * 0.7)
  );

  const journey = `${startSentiment} → ${endSentiment}`;
  const ok = endSentiment === "positive" && startSentiment !== "negative";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer emotion journey</CardTitle>
        <CardDescription>Sentiment score (0–1) by minute; hover for transcript snippet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[240px] w-full">
          {data.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="emoFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="minute" tick={{ fontSize: 11 }} label={{ value: "Minute", position: "insideBottom", offset: -4, fontSize: 11 }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} width={36} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as (typeof data)[0];
                    return (
                      <div className="max-w-xs rounded-md border bg-popover px-2 py-1.5 text-xs shadow-md">
                        <p className="font-medium">Minute {row.minute}</p>
                        <p className="text-muted-foreground">Score: {row.score.toFixed(2)}</p>
                        <p className="mt-1 text-foreground">{row.snippet}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0.6} stroke="#22c55e" strokeDasharray="4 4" />
                <ReferenceLine y={0.3} stroke="#f59e0b" strokeDasharray="4 4" />
                {objectionMarks.map((m, i) => (
                  <ReferenceLine key={`o-${i}`} x={m} stroke="#ef4444" strokeDasharray="2 3" label={{ value: "Obj", fontSize: 10 }} />
                ))}
                {competitorMarks.map((m, i) => (
                  <ReferenceLine key={`c-${i}`} x={m} stroke="#3b82f6" strokeDasharray="2 3" label={{ value: "Comp", fontSize: 10 }} />
                ))}
                <Area type="monotone" dataKey="score" stroke="#3b82f6" fill="url(#emoFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No emotion timeline data.</p>
          )}
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">Journey summary:</span>{" "}
          <span className="font-medium capitalize">{journey}</span>
          {ok ? " ✅" : " ⚠️"}
        </p>
      </CardContent>
    </Card>
  );
}
