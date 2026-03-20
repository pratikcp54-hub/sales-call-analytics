"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SentimentChart } from "@/components/sentiment-chart";
import type { LeaderboardRow, PeriodFilter } from "@/lib/team-analytics";
import type { DimKey } from "@/lib/team-analytics";
import { formatCallDate } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { SortableTableHead } from "@/components/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv-export";

const ZERO_DIMS: Record<DimKey, number> = {
  communication_clarity: 0,
  politeness: 0,
  business_knowledge: 0,
  problem_handling: 0,
  listening_ability: 0,
};

const DIM_SHORT: Record<DimKey, string> = {
  communication_clarity: "Clarity",
  politeness: "Polite",
  business_knowledge: "Knowledge",
  problem_handling: "Problems",
  listening_ability: "Listen",
};

function MiniRadar({ dims }: { dims: Record<DimKey, number> }) {
  const data = [
    { s: "C", v: dims.communication_clarity },
    { s: "P", v: dims.politeness },
    { s: "K", v: dims.business_knowledge },
    { s: "H", v: dims.problem_handling },
    { s: "L", v: dims.listening_ability },
  ];
  return (
    <div className="mx-auto h-[100px] w-[100px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid />
          <PolarAngleAxis dataKey="s" tick={{ fontSize: 9 }} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          <Radar dataKey="v" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function trendArrow(t: LeaderboardRow["trend"]) {
  if (t === "up") return "↑";
  if (t === "down") return "↓";
  return "→";
}

function scoreBadge(score: number) {
  const cls =
    score >= 8
      ? "bg-[#22c55e]/15 text-emerald-900 dark:text-[#22c55e]"
      : score >= 6
        ? "bg-[#f59e0b]/15 text-amber-900 dark:text-amber-200"
        : "bg-[#ef4444]/15 text-red-900 dark:text-red-300";
  return <Badge className={cn("tabular-nums", cls)}>{score.toFixed(1)}</Badge>;
}

type Props = {
  period: PeriodFilter;
  rows: LeaderboardRow[];
  health: { score: number; delta: number | null };
  golden: {
    id: string;
    agent_name: string | null;
    overall_score: number;
    created_at: string;
    call_summary: string | null;
  } | null;
  teamSentiment: { positive: number; neutral: number; negative: number };
  topObjections: { type: string; count: number }[];
  podiumRadars: { agentName: string; dims: Record<DimKey, number> }[];
  topCompetitors: { name: string; mentions: number }[];
};

export function LeaderboardClient({
  period,
  rows,
  health,
  golden,
  teamSentiment,
  topObjections,
  podiumRadars,
  topCompetitors,
}: Props) {
  type LBKey = "agent" | "avgScore" | "calls" | "talk" | "strength" | "improve" | "trend" | "conv";
  const [sortKey, setSortKey] = useState<LBKey>("avgScore");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const onSort = useCallback((key: string) => {
    const k = key as LBKey;
    setSortKey((prev) => {
      if (prev === k) {
        setDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setDirection("asc");
      return k;
    });
  }, []);

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    const dir = direction === "asc" ? 1 : -1;
    const trendVal = (t: LeaderboardRow["trend"]) => (t === "up" ? 2 : t === "flat" ? 1 : 0);
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "agent":
          cmp = a.agentName.localeCompare(b.agentName);
          break;
        case "avgScore":
          cmp = a.avgScore - b.avgScore;
          break;
        case "calls":
          cmp = a.totalCalls - b.totalCalls;
          break;
        case "talk":
          cmp = a.avgTalkRatio - b.avgTalkRatio;
          break;
        case "strength":
          cmp = DIM_SHORT[a.topStrength].localeCompare(DIM_SHORT[b.topStrength]);
          break;
        case "improve":
          cmp = DIM_SHORT[a.improvementArea].localeCompare(DIM_SHORT[b.improvementArea]);
          break;
        case "trend":
          cmp = trendVal(a.trend) - trendVal(b.trend);
          break;
        case "conv":
          cmp = (a.conversionRate ?? -1) - (b.conversionRate ?? -1);
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return arr;
  }, [rows, sortKey, direction]);

  const exportLeaderboardCsv = () => {
    const header = ["Rank", "Agent", "Avg score", "Calls", "Avg talk %", "Top strength", "Improve", "Trend", "Conv %"];
    const data = sortedRows.map((r, i) => [
      i + 1,
      r.agentName,
      r.avgScore.toFixed(1),
      r.totalCalls,
      r.avgTalkRatio.toFixed(0),
      DIM_SHORT[r.topStrength],
      DIM_SHORT[r.improvementArea],
      r.trend,
      r.conversionRate != null ? `${(r.conversionRate * 100).toFixed(0)}%` : "",
    ]);
    downloadCsv(`leaderboard-${period}-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...data]);
  };

  const top3 = rows.slice(0, 3);
  const periodLabel = period === "week" ? "This week" : period === "month" ? "This month" : "All time";
  const radarByName = new Map(podiumRadars.map((p) => [p.agentName, p.dims]));
  const podium = [
    { rank: 2 as const, row: top3[1], medal: "bg-slate-300 text-slate-900" },
    { rank: 1 as const, row: top3[0], medal: "bg-amber-400 text-amber-950 ring-2 ring-amber-200" },
    { rank: 3 as const, row: top3[2], medal: "bg-amber-700 text-amber-50" },
  ].filter((p) => p.row);

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Team leaderboard</h1>
          <p className="text-sm text-muted-foreground">{periodLabel} · ranked by average score</p>
        </div>
        <div className="flex gap-2">
          {(["week", "month", "all"] as const).map((p) => (
            <Link
              key={p}
              href={p === "week" ? "/leaderboard" : `/leaderboard?period=${p}`}
              className={cn(
                buttonVariants({ variant: period === p ? "default" : "outline", size: "sm" })
              )}
            >
              {p === "week" ? "This week" : p === "month" ? "This month" : "All time"}
            </Link>
          ))}
        </div>
      </div>

      {podium.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 3</CardTitle>
            <CardDescription>Podium · radar = dimension averages for the period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end justify-center gap-4 md:gap-8">
              {podium.map(({ rank, row, medal }) => (
                <div
                  key={rank}
                  className={cn(
                    "flex w-[min(100%,200px)] flex-col items-center rounded-xl border p-4",
                    rank === 1 ? "order-2 md:order-none scale-105 border-amber-400/50" : rank === 2 ? "order-1 md:order-none" : "order-3"
                  )}
                >
                  <div className={cn("mb-2 flex size-10 items-center justify-center rounded-full text-lg font-bold", medal)}>{rank}</div>
                  <Link href={`/agents/${encodeURIComponent(row.agentName)}`} className="text-center font-semibold hover:underline">
                    {row.agentName}
                  </Link>
                  <p className="text-2xl font-bold tabular-nums text-primary">{row.avgScore.toFixed(1)}</p>
                  <MiniRadar dims={radarByName.get(row.agentName) ?? ZERO_DIMS} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Full rankings</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={exportLeaderboardCsv} disabled={sortedRows.length === 0}>
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <SortableTableHead sortKey="agent" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Agent
                </SortableTableHead>
                <SortableTableHead sortKey="avgScore" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Avg score
                </SortableTableHead>
                <SortableTableHead sortKey="calls" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Calls
                </SortableTableHead>
                <SortableTableHead sortKey="talk" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Avg talk %
                </SortableTableHead>
                <SortableTableHead sortKey="strength" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Top strength
                </SortableTableHead>
                <SortableTableHead sortKey="improve" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Improve
                </SortableTableHead>
                <SortableTableHead sortKey="trend" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Trend
                </SortableTableHead>
                <SortableTableHead sortKey="conv" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Conv. %
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((r, i) => (
                <TableRow key={r.agentName}>
                  <TableCell className="tabular-nums">{i + 1}</TableCell>
                  <TableCell>
                    <Link href={`/agents/${encodeURIComponent(r.agentName)}`} className="font-medium hover:underline">
                      {r.agentName}
                    </Link>
                  </TableCell>
                  <TableCell>{scoreBadge(r.avgScore)}</TableCell>
                  <TableCell className="tabular-nums">{r.totalCalls}</TableCell>
                  <TableCell className="tabular-nums">{r.avgTalkRatio.toFixed(0)}%</TableCell>
                  <TableCell className="text-muted-foreground">{DIM_SHORT[r.topStrength]}</TableCell>
                  <TableCell className="text-muted-foreground">{DIM_SHORT[r.improvementArea]}</TableCell>
                  <TableCell className="tabular-nums">{trendArrow(r.trend)}</TableCell>
                  <TableCell className="tabular-nums">
                    {r.conversionRate != null ? `${(r.conversionRate * 100).toFixed(0)}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && <p className="px-6 py-4 text-sm text-muted-foreground">No completed calls in this period.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team health</CardTitle>
            <CardDescription>Mean overall score {health.delta != null ? "· vs prior period" : ""}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-8">
            <div className="flex size-36 flex-col items-center justify-center rounded-full border-8 border-primary/25 bg-primary/5">
              <span className="text-4xl font-bold tabular-nums">{health.score.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">/ 10</span>
            </div>
            {health.delta != null && (
              <p className={cn("text-lg font-medium", health.delta >= 0 ? "text-[#22c55e]" : "text-[#ef4444]")}>
                {health.delta >= 0 ? "↑" : "↓"} {Math.abs(health.delta)} week over week
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team sentiment</CardTitle>
            <CardDescription>This period</CardDescription>
          </CardHeader>
          <CardContent>
            <SentimentChart
              positive={teamSentiment.positive}
              neutral={teamSentiment.neutral}
              negative={teamSentiment.negative}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most common objections</CardTitle>
            <CardDescription>By type · this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topObjections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No objections logged</p>
            ) : (
              topObjections.map((o) => (
                <div key={o.type} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{o.type}</span>
                  <Badge variant="secondary">{o.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most mentioned competitors</CardTitle>
            <CardDescription>All time (named in extended insights)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCompetitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">None captured</p>
            ) : (
              topCompetitors.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <Badge variant="outline">{c.mentions}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-base">Golden call {period === "week" ? "this week" : period === "month" ? "this month" : ""}</CardTitle>
            <CardDescription>Highest scored call in range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!golden ? (
              <p className="text-sm text-muted-foreground">No calls yet</p>
            ) : (
              <>
                <p className="font-medium">{golden.agent_name ?? "Unknown agent"}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCallDate(golden.created_at)} · Score {golden.overall_score.toFixed(1)}
                </p>
                <p className="line-clamp-2 text-sm">{golden.call_summary ?? "—"}</p>
                <Link href={`/calls/${golden.id}`} className={cn(buttonVariants(), "inline-flex w-fit")}>
                  Listen &amp; learn
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
