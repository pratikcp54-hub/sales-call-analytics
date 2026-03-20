"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { SortableTableHead } from "@/components/sortable-table-head";
import { formatCallDateTime } from "@/lib/format-datetime";
import type { CallRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv-export";

function statusBadge(status: string) {
  if (status === "completed")
    return <Badge className="bg-[#22c55e] text-white hover:bg-[#22c55e]">Completed</Badge>;
  if (status === "failed") return <Badge className="bg-[#ef4444] text-white hover:bg-[#ef4444]">Failed</Badge>;
  return <Badge variant="secondary">Processing</Badge>;
}

type SortKey = "file" | "date" | "score" | "status";

export function AllCallsTable({ calls }: { calls: CallRow[] }) {
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

  const sorted = useMemo(() => {
    const arr = [...calls];
    const dir = direction === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "file":
          cmp = a.file_name.localeCompare(b.file_name);
          break;
        case "date":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "score":
          cmp = (a.overall_score ?? -1) - (b.overall_score ?? -1);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return arr;
  }, [calls, sortKey, direction]);

  const exportCsv = () => {
    const header = ["File", "Date", "Score", "Status", "Agent", "Call ID"];
    const rows = sorted.map((c) => [
      c.file_name,
      formatCallDateTime(c.created_at),
      c.overall_score != null ? c.overall_score.toFixed(1) : "",
      c.status,
      c.agent_name ?? "",
      c.id,
    ]);
    downloadCsv(`all-calls-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  if (calls.length === 0) {
    return <p className="px-6 py-8 text-center text-sm text-muted-foreground">No calls yet.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end px-6 sm:px-0">
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
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
            <SortableTableHead sortKey="date" activeKey={sortKey} direction={direction} onSort={onSort}>
              Date
            </SortableTableHead>
            <SortableTableHead sortKey="score" activeKey={sortKey} direction={direction} onSort={onSort}>
              Score
            </SortableTableHead>
            <SortableTableHead sortKey="status" activeKey={sortKey} direction={direction} onSort={onSort}>
              Status
            </SortableTableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.file_name}</TableCell>
              <TableCell className="text-muted-foreground">{formatCallDateTime(c.created_at)}</TableCell>
              <TableCell className="tabular-nums">{c.overall_score != null ? c.overall_score.toFixed(1) : "—"}</TableCell>
              <TableCell>{statusBadge(c.status)}</TableCell>
              <TableCell className="text-right">
                <Link href={`/calls/${c.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  Open
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
