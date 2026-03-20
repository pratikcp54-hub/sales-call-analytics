"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { SortableTableHead } from "@/components/sortable-table-head";
import { formatCallDate } from "@/lib/format-datetime";
import type { CallRow } from "@/lib/types";
import { ImprovementInsightsCell } from "@/components/improvement-insights-dialog";
import { improvementInsightsText } from "@/lib/improvement-insights";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv-export";

function statusBadge(status: string) {
  if (status === "completed")
    return <Badge className="bg-[#22c55e] text-white hover:bg-[#22c55e]">Completed</Badge>;
  if (status === "failed") return <Badge className="bg-[#ef4444] text-white hover:bg-[#ef4444]">Failed</Badge>;
  return <Badge variant="secondary">Processing</Badge>;
}

function sentimentBadge(s: string | null) {
  if (!s) return "—";
  const cls =
    s === "positive"
      ? "bg-[#22c55e]/15 text-emerald-900 dark:text-[#22c55e]"
      : s === "negative"
        ? "bg-[#ef4444]/15 text-red-900 dark:text-red-300"
        : "bg-[#f59e0b]/15 text-amber-900 dark:text-amber-200";
  return (
    <Badge variant="secondary" className={cls}>
      {s}
    </Badge>
  );
}

type SortKey = "file" | "agent" | "date" | "duration" | "score" | "conv" | "sentiment" | "status" | "improvement";

export function DashboardCallsTable({ calls }: { calls: CallRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const onSort = useCallback(
    (key: string) => {
      const k = key as SortKey;
      setSortKey((prev) => {
        if (prev === k) {
          setDirection((d) => (d === "asc" ? "desc" : "asc"));
          return prev;
        }
        setDirection("asc");
        return k;
      });
    },
    []
  );

  const sorted = useMemo(() => {
    const arr = [...calls];
    const dir = direction === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "file":
          cmp = a.file_name.localeCompare(b.file_name);
          break;
        case "agent":
          cmp = (a.agent_name ?? "").localeCompare(b.agent_name ?? "");
          break;
        case "date":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "duration":
          cmp = (a.duration_seconds ?? -1) - (b.duration_seconds ?? -1);
          break;
        case "score":
          cmp = (a.overall_score ?? -1) - (b.overall_score ?? -1);
          break;
        case "conv": {
          const pa = a.extended_insights?.conversion_probability ?? -1;
          const pb = b.extended_insights?.conversion_probability ?? -1;
          cmp = pa - pb;
          break;
        }
        case "sentiment": {
          const order = { positive: 0, neutral: 1, negative: 2 };
          const oa = a.sentiment != null ? order[a.sentiment] : 3;
          const ob = b.sentiment != null ? order[b.sentiment] : 3;
          cmp = oa - ob;
          break;
        }
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "improvement":
          cmp = improvementInsightsText(a).localeCompare(improvementInsightsText(b));
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return arr;
  }, [calls, sortKey, direction]);

  const exportCsv = () => {
    const header = [
      "File",
      "Agent",
      "Date",
      "Duration (mm:ss)",
      "Score",
      "Conv. est %",
      "Sentiment",
      "Status",
      "Improvement insights",
      "Call ID",
    ];
    const rows = sorted.map((c) => [
      c.file_name,
      c.agent_name ?? "",
      formatCallDate(c.created_at),
      c.duration_seconds != null
        ? `${Math.floor(c.duration_seconds / 60)}:${String(c.duration_seconds % 60).padStart(2, "0")}`
        : "",
      c.overall_score != null ? c.overall_score.toFixed(1) : "",
      c.extended_insights != null ? (c.extended_insights.conversion_probability * 100).toFixed(0) : "",
      c.sentiment ?? "",
      c.status,
      improvementInsightsText(c),
      c.id,
    ]);
    downloadCsv(`dashboard-calls-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end px-6 sm:px-0">
        <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={sorted.length === 0}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead sortKey="file" activeKey={sortKey} direction={direction} onSort={onSort}>
              File
            </SortableTableHead>
            <SortableTableHead sortKey="agent" activeKey={sortKey} direction={direction} onSort={onSort}>
              Agent
            </SortableTableHead>
            <SortableTableHead sortKey="date" activeKey={sortKey} direction={direction} onSort={onSort}>
              Date
            </SortableTableHead>
            <SortableTableHead sortKey="duration" activeKey={sortKey} direction={direction} onSort={onSort}>
              Duration
            </SortableTableHead>
            <SortableTableHead sortKey="score" activeKey={sortKey} direction={direction} onSort={onSort}>
              Score
            </SortableTableHead>
            <SortableTableHead sortKey="conv" activeKey={sortKey} direction={direction} onSort={onSort} className="whitespace-nowrap">
              Conv.
            </SortableTableHead>
            <SortableTableHead sortKey="sentiment" activeKey={sortKey} direction={direction} onSort={onSort}>
              Sentiment
            </SortableTableHead>
            <SortableTableHead sortKey="status" activeKey={sortKey} direction={direction} onSort={onSort}>
              Status
            </SortableTableHead>
            <SortableTableHead
              sortKey="improvement"
              activeKey={sortKey}
              direction={direction}
              onSort={onSort}
              className="min-w-[200px] max-w-[320px]"
            >
              Improvement insights
            </SortableTableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground">
                No calls match this filter.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="max-w-[200px] truncate font-medium">{c.file_name}</TableCell>
                <TableCell className="max-w-[120px] truncate text-sm">
                  {c.agent_name ? (
                    <Link href={`/agents/${encodeURIComponent(c.agent_name)}`} className="text-[#3b82f6] hover:underline">
                      {c.agent_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatCallDate(c.created_at)}</TableCell>
                <TableCell>
                  {c.duration_seconds != null
                    ? `${Math.floor(c.duration_seconds / 60)}:${String(c.duration_seconds % 60).padStart(2, "0")}`
                    : "—"}
                </TableCell>
                <TableCell className="tabular-nums">{c.overall_score != null ? c.overall_score.toFixed(1) : "—"}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {c.extended_insights != null ? `${(c.extended_insights.conversion_probability * 100).toFixed(0)}%` : "—"}
                </TableCell>
                <TableCell>{sentimentBadge(c.sentiment)}</TableCell>
                <TableCell>{statusBadge(c.status)}</TableCell>
                <TableCell className="max-w-[min(280px,36vw)] align-top">
                  <ImprovementInsightsCell call={c} />
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/calls/${c.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    View analysis
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
