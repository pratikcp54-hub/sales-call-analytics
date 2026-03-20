"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { EmotionTimelinePoint } from "@/lib/types";

const STROKE: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#eab308",
  negative: "#ef4444",
};

export function EmotionTimelineChart({ points }: { points: EmotionTimelinePoint[] }) {
  if (!points.length) {
    return <p className="text-sm text-muted-foreground">No emotion timeline data</p>;
  }

  const data = points.map((p) => ({
    minute: p.minute,
    score: p.score,
    sentiment: p.sentiment,
    label: `m${p.minute}`,
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="minute" tick={{ fontSize: 11 }} label={{ value: "Minute", position: "insideBottom", offset: -4, fontSize: 11 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} width={32} tickFormatter={(v) => v.toFixed(1)} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as (typeof data)[0];
              return (
                <div className="rounded-md border bg-popover px-2 py-1.5 text-xs shadow-md">
                  <p className="font-medium">Minute {row.minute}</p>
                  <p className="text-muted-foreground">Score: {row.score.toFixed(2)}</p>
                  <p style={{ color: STROKE[row.sentiment] ?? "#888" }}>{row.sentiment}</p>
                </div>
              );
            }}
          />
          <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">Score 0–1 (higher ≈ more positive)</p>
    </div>
  );
}
