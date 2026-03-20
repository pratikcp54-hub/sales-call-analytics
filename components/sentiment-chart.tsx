"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type SentimentKey = "positive" | "neutral" | "negative";

/** Semantic: green / amber / red */
const COLORS: Record<SentimentKey, string> = {
  positive: "#22c55e",
  neutral: "#f59e0b",
  negative: "#ef4444",
};

type Slice = { name: string; value: number; key: SentimentKey };

export function SentimentChart({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const data = [
    { name: "Positive", value: positive, key: "positive" as const },
    { name: "Neutral", value: neutral, key: "neutral" as const },
    { name: "Negative", value: negative, key: "negative" as const },
  ].filter((d): d is Slice => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
        No completed calls yet
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
