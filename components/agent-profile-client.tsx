"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCallDate } from "@/lib/format-datetime";
import { SortableTableHead } from "@/components/sortable-table-head";
import type { CallRow } from "@/lib/types";
import type { WeeklyPoint, DimOverTimeRow, DimKey } from "@/lib/team-analytics";
import { cn } from "@/lib/utils";

const DIM_LABEL: Record<DimKey, string> = {
  communication_clarity: "Clarity",
  politeness: "Politeness",
  business_knowledge: "Knowledge",
  problem_handling: "Problems",
  listening_ability: "Listening",
};

type Props = {
  agentName: string;
  totalAnalyzed: number;
  avgScore: number | null;
  weeklyTrend: WeeklyPoint[];
  radarAgent: Record<DimKey, number>;
  radarTeam: Record<DimKey, number>;
  dimOverTime: DimOverTimeRow[];
  talkByCall: { id: string; created_at: string; agentTalk: number }[];
  fillerTotals: Record<string, number>;
  monologuePerCall: { callId: string; idx: number; count: number }[];
  recentCalls: CallRow[];
};

export function AgentProfileClient(props: Props) {
  const {
    agentName,
    totalAnalyzed,
    avgScore,
    weeklyTrend,
    radarAgent,
    radarTeam,
    dimOverTime,
    talkByCall,
    fillerTotals,
    monologuePerCall,
    recentCalls,
  } = props;

  const radarData = (Object.keys(DIM_LABEL) as DimKey[]).map((k) => ({
    subject: DIM_LABEL[k],
    agent: radarAgent[k],
    team: radarTeam[k],
    fullMark: 10,
  }));

  const dimKeys = Object.keys(DIM_LABEL) as DimKey[];
  const lineColors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#6366f1"];

  const fillerBars = Object.entries(fillerTotals)
    .filter(([, v]) => v > 0)
    .map(([name, count]) => ({ name: name.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count);

  const monoBars = monologuePerCall.map((m) => ({
    idx: m.idx,
    count: m.count,
  }));

  const completedRecent = useMemo(
    () => recentCalls.filter((c) => c.status === "completed").slice(0, 20),
    [recentCalls]
  );

  type SortKey = "date" | "score" | "sentiment" | "talk" | "conversion";
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const onSort = useCallback((key: string) => {
    const k = key as SortKey;
    setSortKey((prev) => {
      if (prev === k) {
        setDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setDirection("asc");
      return k;
    });
  }, []);

  const sortedRecent = useMemo(() => {
    const arr = [...completedRecent];
    const dir = direction === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "score":
          cmp = (a.overall_score ?? -1) - (b.overall_score ?? -1);
          break;
        case "sentiment": {
          const order = { positive: 0, neutral: 1, negative: 2 };
          const oa = a.sentiment != null ? order[a.sentiment] : 3;
          const ob = b.sentiment != null ? order[b.sentiment] : 3;
          cmp = oa - ob;
          break;
        }
        case "talk":
          cmp = (a.agent_talk_percent ?? -1) - (b.agent_talk_percent ?? -1);
          break;
        case "conversion": {
          const label = (c: CallRow) =>
            c.conversion_tag === "converted"
              ? "1"
              : c.conversion_tag === "not_converted"
                ? "2"
                : c.conversion_tag === "follow_up_pending"
                  ? "3"
                  : c.extended_insights
                    ? `4${(c.extended_insights.conversion_probability * 100).toFixed(0)}`
                    : "5";
          cmp = label(a).localeCompare(label(b));
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return arr;
  }, [completedRecent, sortKey, direction]);

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{agentName}</h1>
          <p className="text-sm text-muted-foreground">Agent performance profile</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Card className="border-primary/30">
            <CardHeader className="py-3 pb-1">
              <CardDescription>Calls analyzed</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{totalAnalyzed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="py-3 pb-1">
              <CardDescription>Avg score</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{avgScore != null ? avgScore.toFixed(1) : "—"}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance trend</CardTitle>
          <CardDescription>Weekly average score (last 8 weeks)</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strength & weakness radar</CardTitle>
          <CardDescription>Agent vs team average (completed calls)</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
              <Radar name="Agent" dataKey="agent" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
              <Radar name="Team avg" dataKey="team" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score progress (last 12 calls)</CardTitle>
          <CardDescription>One line per dimension</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dimOverTime.map((r, i) => ({ i: i + 1, ...r.scores }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="i" tick={{ fontSize: 11 }} label={{ value: "Call #", position: "insideBottom", offset: -6 }} />
              <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {dimKeys.map((k, idx) => (
                <Line key={k} type="monotone" dataKey={k} name={DIM_LABEL[k]} stroke={lineColors[idx % lineColors.length]} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Talk time trend</CardTitle>
          <CardDescription>Red dashed line at 60% ideal max; &gt;65% flagged as over-talking</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={talkByCall.map((t, i) => ({ ...t, idx: i + 1, over: t.agentTalk > 65 }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "60%", fontSize: 10 }} />
              <Bar dataKey="agentTalk" radius={[4, 4, 0, 0]}>
                {talkByCall.map((t, i) => (
                  <Cell key={t.id ?? i} fill={t.agentTalk > 65 ? "#ef4444" : "#22c55e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filler words (all calls)</CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fillerBars} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Long monologues per call</CardTitle>
            <CardDescription>Count of 2+ minute agent-only stretches</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monoBars}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="idx" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent calls</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="date" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Date
                </SortableTableHead>
                <SortableTableHead sortKey="score" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Score
                </SortableTableHead>
                <SortableTableHead sortKey="sentiment" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Sentiment
                </SortableTableHead>
                <SortableTableHead sortKey="talk" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Talk%
                </SortableTableHead>
                <SortableTableHead sortKey="conversion" activeKey={sortKey} direction={direction} onSort={onSort}>
                  Conversion
                </SortableTableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRecent.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{formatCallDate(c.created_at)}</TableCell>
                    <TableCell className="tabular-nums">{c.overall_score?.toFixed(1) ?? "—"}</TableCell>
                    <TableCell>{c.sentiment ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{c.agent_talk_percent?.toFixed(0) ?? "—"}%</TableCell>
                    <TableCell>
                      {c.conversion_tag === "converted"
                        ? "Converted"
                        : c.conversion_tag === "not_converted"
                          ? "Not converted"
                          : c.conversion_tag === "follow_up_pending"
                            ? "Follow-up"
                            : c.extended_insights
                              ? `${(c.extended_insights.conversion_probability * 100).toFixed(0)}% est.`
                              : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/calls/${c.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              {sortedRecent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No completed calls yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
